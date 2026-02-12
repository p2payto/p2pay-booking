Booking system for any type of service that requires a calendar, from an online class to a room reservation.  
For bitcoiners, KYC free, self custodial.  
The client can pay in bitcoin and fiat and the merchant always receives bitcoin.  
Without KYC requirements for the merchant and the client. Merchant and buyer personal information are never shared with the counterparty.  
[Demo](https://booking.learntheropes.xyz)

## Status
The development of this project is currently paused, waiting for Peach Bitcoin to implement buy offers to resume the development.  
- [x] Btcpay server api integration. Done.  
- [x] Bitcoin checkout. On-chain and Lighning Network. Done. 
- [x] Optional USDt checkout if configured on btcpay server. Done 
- [x] Calendar integration. Google calendar done. Looking for privacy oriented calendar to add as alternative.  
- Fiat integration with Peach Bitcoin api. Under current development
- Fiat integration with Robosat. Under current development here: https://github.com/p2payserver/robosats-nuxt3. However it requires a deposit (bond) from the buyer that the merchant may willing to anticipate.
- [ ] Fiat integration with Mostro. To be considered if feasible
- [ ] Fiat integration with hodl Hodl. To be considered if feasible, probably creation of accounts is not possible prof api. 

## Features
- Self custodial solution with btcpay server integration.  
- Supports on-chain and Lighning Network payments. 
- Optionally supports fiat with the merchant always receiving bitcoins.  
- Unlimited services and unlimited extras for each service.  
- Supports any service duration, from 1 minutes to multiple days.  
- Multilingual: English, Spanish and Italian out of the box with the easy option to add additional translations.  
- Static generate pages without cookies.   
- Technical SEO opimized and 98/100 Google Lighthouse performance score.

## Target
- Bitcoin enthusiasts: you believe in Bitcoin sound money but at the same time you know that Bitcoin is not widely used as you wish. This tool allows you to reach the traditional market without touching fiat money.  
- High risk businesses: you are involved in legal high risk business such as adult or legal cannabis and you can't find a traditional payment gateway supporting your business.  
- Unbanked and sanctioned: you are unbanked, or you live in a country that has not easy access to popular payment processors like Stripe, because your country is unsupported or even sanctioned.  
- Emerging markets: you want to expand your virtual service business to emerging markets like LATAM and Africa and you lack of a reliable payment gateway.

## Payment methods. Fees. Limits.
- Bitcoin: onchain and lightning network, No fee. No amount limit.  
- USDt: on Tron if you have the plugin on btcpay. No fee. No amount limit
- Fiat: All the currencies and local payment methods supported by [Peach Bitcoin](https://peachbitcoin.com) as listed [here](https://api.peachbitcoin.com/v1/info). Tens of local payment methods in Europe, LATAM, Africa with more to come, US excluded. The fee is set by the merchant and paid by the buyer. realistically, to find a match it should be between 5 and 8%, plus 2% Peach fee. 1000 CHF (or equivalent in other currency) amount limit for each payment.  

## Setup
1. Clone the repo.  
2. Edit the repo configuration in `./content/settings.yaml` accordingly to your needs. The file is commented to explain each setting meaning. 
3. Create a `profile.md` file inside each `./content` folder and the language subfolder. Check [this](https://github.com/p2payto/p2pay-booking/blob/main/content/en/profile.md?plain=1) file comments for available settings.
This is optional. If you want to skip the profile and offer just one service, you can set the `DEFAULT_SERVICE` env variable to the service file name.
4. Create one file for each service inside each `./content` folder and the language subfolder. Check [this](https://github.com/p2payto/p2pay-booking/blob/main/content/en/services/1.paraguay-residency.md?plain=1) file comments for available settings.
Optionally, if you want to show the services in a specific order, add the order number at the beginning of the name followed by a dot, eg `1.my-service.md` 
5. Set the enviroment variables as in the `./.env.example` file.  
6. Optionally set a custom color in the [first line](https://github.com/p2payto/p2pay-booking/blob/de5be9f24fe72c59a8f10557451a8af0afbdd601/assets/scss/custom.scss#L1) of `./assets/scss/custom.scss`.  
7. Optionally add or remove languages support by adding/removing translations in `./lang` folder and settings in `./assets/js/locale.js` `locales` [json object](https://github.com/p2payto/p2pay-booking/blob/de5be9f24fe72c59a8f10557451a8af0afbdd601/assets/js/locales.js#L3C5-L26C3). 
8. For google calendar integration, create a service account on google in a new project. Enable the google calendar API. Create a key and copy the email and the private key. Create a new calendar in your googgle account and share it with writing privilege with the service email. Add all the variables to the `.env` file. Optional add also a comma separated list of calendars id to check when you are busy. These calendars must be shared as well with reading privileges with the service email.
9. Deploy (Digital Ocean app platform is supported out of the box, Vercel is supported with a few settings change that I will document soon, Self hosting is supported if you know how to build and deploy a Nuxt application).  

## BTCPay instance
If you don't have a btcpay instance, feel free to [email](mailto:giovanni@learntheropes.xyz) me optionally with [PGP](https://keys.openpgp.org/vks/v1/by-fingerprint/B683932A2E5629234C48605E5CF45E311D1FB753) and I will invite you to create an account/store on my btcpay server.  
The API key that you provide, must have at least the following privileges: read invoice, create invoice, read store.

## Contribution
The most valuable contributions at the moment are:
  - Bug report: test the software and report bugs using github issues.
  - Feedbacks: let me know what would you would like to see implemeneted using github issues

Commits to the code are appreciated. Please [sign](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) your commit.

## Star History
[![Star History Chart](https://api.star-history.com/svg?repos=p2payto/p2pay-booking&type=date&legend=top-left)](https://www.star-history.com/#p2payto/p2pay-booking&type=date&legend=top-left)

### Project inspired by [**BitPagos**](https://web.archive.org/web/20141225131358/https://www.bitpagos.com/es/) and [**LNCal**](https://lncal.com/).
