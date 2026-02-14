<script setup>
import kebabCase from 'lodash.kebabcase';
import sortBy from 'lodash.sortby';

// Get props from [service].vue page
const {
  service,
  disabled
} = defineProps({
  service: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
  }
});

const peachProxy = 'https://peach-cors-proxy.vercel.app';

// Get the buyer leanguage
const { locale } = useI18n();

// Get the service specific settings from md file
const {
  duration,
  currency: merchantCurrency,
  price: merchantPrice,
  extras
} = await queryContent(`/services/${service}`).locale(locale.value).findOne();

// Get needed functions from plugins
const {
  // Ugly functions to disable instead of hide the datepicker navigation
  // On mount
  $disableDatapickerNavigationOnMount,
  // And on update
  $updateDatapickerNavigation,
  // Function to get the Datepicker field settings
  $getDatepicker,
  // Function to restive the daily free spots
  $getAvailableSlots,
  // Function the get the invoice from btcpay
  $createInvoice,
  // getDecimal function from currency
  $getDecimal,
  // Function to listen event
  $listen,
  // Function to capitalize strings
  $capitalize,
} = useNuxtApp();

// Dirty hack to show and disable previous icon in datepicker
// if there isn't a previous month available and enable it again
$disableDatapickerNavigationOnMount();
let datepickerCurrentMonth = new Date().getMonth();
const onChangeMonth = (month) => {
  datepickerCurrentMonth = month
  $updateDatapickerNavigation('booking', datepickerCurrentMonth, datepickerCurrentYear)
};
let datepickerCurrentYear = new Date().getFullYear();
const onChangeYear = (year) => {
  datepickerCurrentYear = year
  $updateDatapickerNavigation('booking', datepickerCurrentMonth, datepickerCurrentYear)
};

const bookingCurrency = ref(null);
const decimal = ref(null);
const buyerPaymentMethods = ref([]);
const peachAvailableCurrencies = ref([])
const peachRate = ref(null);

onMounted(async () => {
  // Get the buyer currency based on the IP location
  // Default to USD if IP contry is undefined
  const { data } = await useFetch('/api/country', { server: false })
  bookingCurrency.value = data.value.currency

  // Define the decimal length based on the currency
  decimal.value = $getDecimal(bookingCurrency.value)
  const {
    paymentMethods: peachPaymentMethods
  } = await $fetch(`/v1/info/`, {
    baseURL: peachProxy
  });

  // Get available fiat methods for the buyer currency
  console.log('bookingCurrency.value', bookingCurrency.value)
  buyerPaymentMethods.value = sortBy(peachPaymentMethods
    .filter(method => method.currencies.includes(bookingCurrency.value) && !method.anonymous)
    .map(method => {
      return {
        id: method.id,
        name: $capitalize(kebabCase(method.id).replace('-', ' ')).replace('-', '%')
      }
    }), 'name');

  // Get all the currencies available on peach
  const peachCurrencies = await $fetch(`/v1/market/prices`, {
    baseURL: peachProxy
  });
  peachAvailableCurrencies.value = Object.keys(peachCurrencies).filter(currency => currency !== 'SAT' && currency !== 'USDT').sort()

  // Get Peach exchange rate
  const { price } = await $fetch(`/v1/market/price/BTC${bookingCurrency.value}`, {
    baseURL: peachProxy
  });
  peachRate.value = price
})

// Get merchant fields settings
const {
  fields: {
    name,
    email,
    pgp,
    details
  }
} = await queryContent(`/settings`).findOne();

// Define the form reactive properties
const initialForm = {
  bookingDate: '',
  bookingTime: [],
  bookingExtras: [],
  bookingName: '',
  bookingEmail: '',
  bookingFingerprint: '',
  bookingPGP: '',
  bookingDescription: '',
  bookingService: service,
  bookingGatewayType: '',
  bookingGatewayPaymentMethod: '',
  bookingFiatCurrency: bookingCurrency,
  bookingFiatRate: peachRate,
  bookingFiatDecimal: decimal,
  bitcoinExhangeRate: 0,
  bookingBitcoinAmount: 0,
  bookingFiatAmount: 0
}
const form = ref(initialForm);

// Define the form validation
const validationSchema = {
  bookingDate: {
    required: true,
  },
  bookingTime: {
    required: true,
    arrayLengthBetween: {
      min: 1,
      max: 30
    }
  },
  bookingName: (name) ? {
    required: name === 'required'
  } : null,
  bookingEmail: (email) ? {
    required: email === 'required',
    email: email === 'required'
  } : null,
  bookingFingerprint: (pgp) ? {
    required: pgp === 'required',
    // This setting goes together with return true in the custom rule if there is no value provided
    // If one is provided, I want to make sure that is correct.
    checkPGPKey: `@bookingEmail`,
  } : null,
  bookingDescription: (details) ? {
    required: details === 'required',
  } : null
};

// Listen for the pgp key emited by the custom validation finction
// This is to avoid calling the server twice, for validation and storing
$listen('setPGP', (pgp) => form.value.bookingPGP = pgp);

// Get the calendar settings object
const {
  showWeekNumber,
  firstDayOfWeek,
  unselectableDaysOfWeek,
  minDate,
  modelValue
} = await $getDatepicker(disabled);

// Watch the change on buyer date
// Clear buyer time and update free slots
let freeSlots = ref([])
watch(async () => form.value.bookingDate, async () => {

  form.value.bookingTime = []
  isLoadingFreeSlots.value = true;

  freeSlots.value = await $getAvailableSlots({
    form,
    service,
    duration
  });
  isLoadingFreeSlots.value = false
});

// Get the bitcoin exchange rate in the currency and provider of the merchant
const { rate: btcExchangeRateForMerchantCurrency } = await $fetch(`/api/rates/${merchantCurrency}`);
form.value.bitcoinExhangeRate = parseFloat(btcExchangeRateForMerchantCurrency);

// Calculate the total price of the service in bitcoin 
const totalServicePriceInBitcoin = computed(() => {
  const basePriceInBitcoin = (form.value.bookingTime.length * merchantPrice / parseFloat(btcExchangeRateForMerchantCurrency));
  const extraPriceInBitcoin = form.value.bookingExtras.reduce((sum, extra) => sum + extra.price, 0) / parseFloat(btcExchangeRateForMerchantCurrency);
  const total = (basePriceInBitcoin + extraPriceInBitcoin).toFixed(8);
  form.value.bookingBitcoinAmount = total;
  return total;
});

// If the buyer changes the currency or the price in bitcoin changes
// Update the listed payment methods and the amount of fiat
let priceInbookingCurrency = ref(0);
watch(async () => [form.value.bookingFiatCurrency, totalServicePriceInBitcoin.value], async () => {

  const { paymentMethods: peachPaymentMethods } = await $fetch(`/v1/info`, {
    baseURL: peachProxy
  });
  buyerPaymentMethods.value = sortBy(peachPaymentMethods
    .sort()
    .filter(method => method.currencies.includes(form.value.bookingFiatCurrency) && !method.anonymous)
    .map(method => {
      return {
        id: method.id,
        name: $capitalize(kebabCase(method.id).replace('-', ' ')).split('-')[0]
      }
    }), 'name');

  const { price: bookingCurrencyExchangeRate } = await $fetch(`/v1/market/price/BTC${form.value.bookingFiatCurrency}`, {
    baseURL: peachProxy
  });
  form.value.bookingFiatRate = bookingCurrencyExchangeRate;
  form.value.bookingFiatDecimal = $getDecimal(form.value.bookingFiatCurrency);
  form.value.bookingFiatAmount = (totalServicePriceInBitcoin.value * (((premium) / 100) + 1) * bookingCurrencyExchangeRate).toFixed(form.value.bookingFiatDecimal);
});

// Handle is loading free slots
const isLoadingFreeSlots = ref(false);

$listen('setIsLoadingFreeSlots', (bool) => {
  isLoadingFreeSlots.value = bool;
});

// Reset times selections
const clearTime = () => {
  form.value.bookingTime = [];
};

// Reset extras selections
const clearExtras = () => {
  form.value.bookingExtras = [];
};

// Filter merchant enabled gateways
const {
  gateways,
  premium
} = await queryContent(`/settings`).findOne();

// Set the choosen gateway at the same moment the form is submitted
const setGateway = (bookingGatewayType, bookingGatewayPaymentMethod, bookingFiatCurrency) => {
  form.value.bookingGatewayType = bookingGatewayType;
  form.value, bookingGatewayPaymentMethod = bookingGatewayPaymentMethod;
  form.value.bookingFiatCurrency = bookingFiatCurrency;
}

const isLoadingPage = ref(false);

const createInvoice = async () => {
  // Handle page load on form submit
  isLoadingPage.value = true
  // Create the invoice
  console.log('form.value', form.value)
  await $createInvoice(form.value);
};

</script>

<template>
  <div>
    <OLoading :full-page="true" v-model:active="isLoadingPage" :can-cancel="false">
      <OIcon pack="mdi" icon="loading" size="large" spin />
    </OLoading>
    <!-- working examples ooruga with vee-validate:
    https://github.com/logaretm/vee-validate/issues/3575
    https://codesandbox.io/s/itp29?file=/src/App.vue -->
    <VForm name="booking" :validation-schema="validationSchema" @submit="createInvoice">
      <VField name="bookingDate" :label="$t('serviceBookingForm.bookingDate')"
        v-slot="{ handleChange, handleBlur, value, errors }" v-model="form.bookingDate">
        <OField :label="$t('serviceBookingForm.bookingDate')" :variant="errors[0] ? 'danger' : null"
          :message="errors[0] ? errors[0] : ''">
          <ODatepicker :label="$t('serviceBookingForm.bookingDate')" :aria-label="$t('serviceBookingForm.bookingDate')"
            :model-value="value" @update:modelValue="handleChange" @change="handleChange" @blur="handleBlur"
            @change-month="onChangeMonth" @change-year="onChangeYear" :locale="locale.value"
            :showWeekNumber="showWeekNumber" :firstDayOfWeek="firstDayOfWeek"
            :unselectableDaysOfWeek="unselectableDaysOfWeek" :minDate="minDate" :modelValue="modelValue" inline />
        </OField>
      </VField>

      <VField name="bookingTime" :label="$t('serviceBookingForm.bookingTime')"
        v-slot="{ handleChange, handleBlur, value, errors }" v-model="form.bookingTime">
        <OField :label="$t('serviceBookingForm.bookingTime')" :variant="errors[0] ? 'danger' : null"
          :message="errors[0] ? errors[0] : ''">
          <OLoading :full-page="false" v-model:active="isLoadingFreeSlots" :can-cancel="false">
            <OIcon pack="mdi" icon="loading" size="large" spin class="is-hidden-mobile" />
            <OIcon pack="mdi" icon="loading" size="small" spin class="is-hidden-tablet" />
          </OLoading>
          <OSelect :label="$t('serviceBookingForm.bookingTime')" :aria-label="$t('serviceBookingForm.bookingTime')"
            :model-value="value" @update:modelValue="handleChange" @change="handleChange" @blur="handleBlur"
            :native-size="freeSlots.length || 3" multiple expanded>
            <option v-if="!form.bookingDate" disabled>
              {{ $t('serviceBookingForm.selectDateFirst') }}
            </option>
            <option v-for="freeSlot of freeSlots" :key="freeSlot.value" :value="freeSlot.value">{{
              $t('serviceBookingForm.from') }} {{ freeSlot.display.from }} {{ $t('serviceBookingForm.to') }} {{
                freeSlot.display.to }}</option>
          </OSelect>
        </OField>
        <p v-if="form.bookingTime.length" @click.native="clearTime" class="help is-primary">
          <OIcon pack="mdi" icon="close" size="small" />
          {{ $t('serviceBookingForm.clearSelection') }}
        </p>
      </VField>

      <VField v-if="extras && extras.length" name="bookingExtras" :label="$t('serviceBookingForm.bookingExtras')"
        v-slot="{ handleChange, handleBlur, value, errors }" v-model="form.bookingExtras">
        <OField :label="$t('serviceBookingForm.bookingExtras')" :variant="errors[0] ? 'danger' : null"
          :message="errors[0] ? errors[0] : ''">
          <OSelect :label="$t('serviceBookingForm.bookingExtras')" :aria-label="$t('serviceBookingForm.bookingExtras')"
            :model-value="value" @update:modelValue="handleChange" @change="handleChange" @blur="handleBlur"
            :native-size="extras.length" multiple expanded>
            <option v-for="extra of extras" :key="extra.title" :value="extra">{{ extra.title }}</option>
          </OSelect>
        </OField>
        <p v-if="form.bookingExtras.length" @click.native="clearExtras" class="help is-primary">
          <OIcon pack="mdi" icon="close" size="small" />
          {{ $t('serviceBookingForm.clearSelection') }}
        </p>
      </VField>

      <VField name="bookingName" :label="$t('serviceBookingForm.bookingName')"
        v-slot="{ handleChange, handleBlur, value, errors }" v-model="form.bookingName">
        <OField v-if="name" :label="$t('serviceBookingForm.bookingName')" :variant="errors[0] ? 'danger' : null"
          :message="errors[0] ? errors[0] : ''">
          <OInput :label="$t('serviceBookingForm.bookingName')" :aria-label="$t('serviceBookingForm.bookingName')"
            :model-value="value" @update:modelValue="handleChange" @change="handleChange" @blur="handleBlur" />
        </OField>
      </VField>

      <VField name="bookingEmail" :label="$t('serviceBookingForm.bookingEmail')"
        v-slot="{ handleChange, handleBlur, value, errors }" v-model="form.bookingEmail">
        <OField v-if="email" :label="$t('serviceBookingForm.bookingEmail')" :variant="errors[0] ? 'danger' : null"
          :message="errors[0] ? errors[0] : ''">
          <OInput :label="$t('serviceBookingForm.bookingEmail')" :aria-label="$t('serviceBookingForm.bookingEmail')"
            type="email" :model-value="value" @update:modelValue="handleChange" @change="handleChange"
            @blur="handleBlur" />
        </OField>
      </VField>

      <!-- 5BA78A510CDA44132BDC51FA58C798100FF8A743 -->
      <VField name="bookingFingerprint" :label="$t('serviceBookingForm.bookingFingerprint')"
        v-slot="{ handleChange, handleBlur, value, errors }" v-model="form.bookingFingerprint">
        <OField v-if="pgp" :label="$t('serviceBookingForm.bookingFingerprint')" :variant="errors[0] ? 'danger' : null"
          :message="errors[0] ? errors[0] : $t('serviceBookingForm.fingerprintOnServer')">
          <!-- https://github.com/logaretm/vee-validate/issues/3575#issuecomment-1516900983 -->
          <OInput :label="$t('serviceBookingForm.bookingFingerprint')"
            :aria-label="$t('serviceBookingForm.bookingFingerprint')" :model-value="value" @change="handleChange"
            @blur="handleBlur" expanded />
        </OField>
      </VField>

      <VField name="bookingDescription" :label="$t('serviceBookingForm.bookingDescription')"
        v-slot="{ handleChange, handleBlur, value, errors }" v-model="form.bookingDescription">
        <OField v-if="details" :label="$t('serviceBookingForm.bookingDescription')"
          :variant="errors[0] ? 'danger' : null" :message="errors[0] ? errors[0] : ''">
          <OInput :label="$t('serviceBookingForm.bookingDescription')"
            :aria-label="$t('serviceBookingForm.bookingDescription')" type="textarea" :model-value="value"
            @update:modelValue="handleChange" @change="handleChange" @blur="handleBlur" expanded :maxlength="250"
            :hasCounter="true" />
        </OField>
      </VField>

      <p class="help">{{ $t('serviceBookingForm.getDiscount', { premium }) }}</p>

      <OField>
        <OButton variant="primary" @click.native="setGateway('crypto', null, null)" native-type="submit"
          icon-right="sale" expanded>{{ `${$t('invoiceBitcoinNew.payWith')} bitcoin ${form.bookingBitcoinAmount} BTC` }}
        </OButton>
      </OField>

      <p v-if="gateways.fiat && buyerPaymentMethods.length" class="help">{{ $t('serviceBookingForm.approximatePrice') }}
      </p>

      <OField grouped group-multiline>
        <OButton v-if="gateways.fiat && buyerPaymentMethods.length" v-for="paymentMethod in buyerPaymentMethods"
          :key="paymentMethod.id" variant="primary" outlined
          @click="setGateway('fiat', paymentMethod.id, bookingCurrency)" native-type="submit" expanded>{{
            `${$t('invoiceBitcoinNew.payWith')} ${paymentMethod.name} ${form.bookingFiatAmount}
          ${form.bookingFiatCurrency}` }}</OButton>
        <div v-else>{{ $t('serviceBookingForm.fiatNotAvailable') }}</div>
      </OField>

      <VField name="changeCurrency" :label="$t('serviceBookingForm.changeCurrency')"
        v-slot="{ handleChange, handleBlur, value }" v-model="form.bookingFiatCurrency">
        <OField :label="$t('serviceBookingForm.changeCurrency')" class="change">
          <OSelect :label="$t('serviceBookingForm.changeCurrency')"
            :aria-label="$t('serviceBookingForm.changeCurrency')" :model-value="value" @update:modelValue="handleChange"
            @change="handleChange" @blur="handleBlur" expanded>
            <option v-for="currency of peachAvailableCurrencies" :key="currency" :value="currency">{{ currency }}
            </option>
          </OSelect>
        </OField>
      </VField>
    </VForm>
  </div>
</template>

<style>
/* Make the pagination bottons visible also when disabled
and keep their initial size */
.pagination-previous {
  display: block !important;
  flex-grow: initial;
}

.pagination-next {
  display: block !important;
  flex-grow: initial;
}

/* Remove the scrolbar on multiselect if not needed */
select {
  overflow-y: auto;
}

/* Make the fields message multiline to avoid form to expand */
.help {
  white-space: pre-wrap;
}

.field.is-grouped> :not(:last-child) {
  margin-right: 0px;
}

.change {
  padding-top: 0.5em;
}
</style>
