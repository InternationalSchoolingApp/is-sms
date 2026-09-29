/**
 * Currency display data for the payment modal's "Payment Amount" card —
 * copied verbatim from commonPaymentGateway.js (FLAG_COUNTRY_TO_CURRENCY,
 * CURRENCY_TO_FLAG_COUNTRY, CURRENCY_TO_SYMBOL, getCurrencyDisplaySymbol,
 * formatMoneyWithCommas). Flags are the backend's static/theme2/fonts/<ISO2>.svg.
 */

// ISO2 country -> its official currency (ISO 4217).
export const FLAG_COUNTRY_TO_CURRENCY = {
	AD:'EUR', AE:'AED', AF:'AFN', AG:'XCD', AI:'XCD', AL:'ALL', AM:'AMD', AO:'AOA', AQ:'USD', AR:'ARS', AS:'USD', AT:'EUR', AU:'AUD', AW:'AWG', AX:'EUR', AZ:'AZN',
	BA:'BAM', BB:'BBD', BD:'BDT', BE:'EUR', BF:'XOF', BG:'BGN', BH:'BHD', BI:'BIF', BJ:'XOF', BL:'EUR', BM:'BMD', BN:'BND', BO:'BOB', BQ:'USD', BR:'BRL', BS:'BSD', BT:'BTN', BV:'NOK', BW:'BWP', BY:'BYN', BZ:'BZD',
	CA:'CAD', CC:'AUD', CD:'CDF', CF:'XAF', CG:'XAF', CH:'CHF', CI:'XOF', CK:'NZD', CL:'CLP', CM:'XAF', CN:'CNY', CO:'COP', CR:'CRC', CU:'CUP', CV:'CVE', CW:'ANG', CX:'AUD', CY:'EUR', CZ:'CZK',
	DE:'EUR', DJ:'DJF', DK:'DKK', DM:'XCD', DO:'DOP', DZ:'DZD',
	EC:'USD', EE:'EUR', EG:'EGP', EH:'MAD', ER:'ERN', ES:'EUR', ET:'ETB',
	FI:'EUR', FJ:'FJD', FK:'FKP', FM:'USD', FO:'DKK', FR:'EUR',
	GA:'XAF', GB:'GBP', GD:'XCD', GE:'GEL', GF:'EUR', GG:'GBP', GH:'GHS', GI:'GIP', GL:'DKK', GM:'GMD', GN:'GNF', GP:'EUR', GQ:'XAF', GR:'EUR', GS:'GBP', GT:'GTQ', GU:'USD', GW:'XOF', GY:'GYD',
	HK:'HKD', HM:'AUD', HN:'HNL', HR:'EUR', HT:'HTG', HU:'HUF',
	ID:'IDR', IE:'EUR', IL:'ILS', IM:'GBP', IN:'INR', IO:'USD', IQ:'IQD', IR:'IRR', IS:'ISK', IT:'EUR',
	JE:'GBP', JM:'JMD', JO:'JOD', JP:'JPY',
	KE:'KES', KG:'KGS', KH:'KHR', KI:'AUD', KM:'KMF', KN:'XCD', KP:'KPW', KR:'KRW', KW:'KWD', KY:'KYD', KZ:'KZT',
	LA:'LAK', LB:'LBP', LC:'XCD', LI:'CHF', LK:'LKR', LR:'LRD', LS:'LSL', LT:'EUR', LU:'EUR', LV:'EUR', LY:'LYD',
	MA:'MAD', MC:'EUR', MD:'MDL', ME:'EUR', MF:'EUR', MG:'MGA', MH:'USD', MK:'MKD', ML:'XOF', MM:'MMK', MN:'MNT', MO:'MOP', MP:'USD', MQ:'EUR', MR:'MRU', MS:'XCD', MT:'EUR', MU:'MUR', MV:'MVR', MW:'MWK', MX:'MXN', MY:'MYR', MZ:'MZN',
	NA:'NAD', NC:'XPF', NE:'XOF', NF:'AUD', NG:'NGN', NI:'NIO', NL:'EUR', NO:'NOK', NP:'NPR', NR:'AUD', NU:'NZD', NZ:'NZD',
	OM:'OMR',
	PA:'PAB', PE:'PEN', PF:'XPF', PG:'PGK', PH:'PHP', PK:'PKR', PL:'PLN', PM:'EUR', PN:'NZD', PR:'USD', PS:'ILS', PT:'EUR', PW:'USD', PY:'PYG',
	QA:'QAR',
	RE:'EUR', RO:'RON', RS:'RSD', RU:'RUB', RW:'RWF',
	SA:'SAR', SB:'SBD', SC:'SCR', SD:'SDG', SE:'SEK', SG:'SGD', SH:'SHP', SI:'EUR', SJ:'NOK', SK:'EUR', SL:'SLE', SM:'EUR', SN:'XOF', SO:'SOS', SR:'SRD', SS:'SSP', ST:'STN', SV:'USD', SX:'ANG', SY:'SYP', SZ:'SZL',
	TC:'USD', TD:'XAF', TF:'EUR', TG:'XOF', TH:'THB', TJ:'TJS', TK:'NZD', TL:'USD', TM:'TMT', TN:'TND', TO:'TOP', TR:'TRY', TT:'TTD', TV:'AUD', TW:'TWD', TZ:'TZS',
	UA:'UAH', UG:'UGX', UM:'USD', US:'USD', UY:'UYU', UZ:'UZS',
	VA:'EUR', VC:'XCD', VE:'VES', VG:'USD', VI:'USD', VN:'VND', VU:'VUV',
	WF:'XPF', WS:'WST',
	XK:'EUR',
	YE:'YER', YT:'EUR',
	ZA:'ZAR', ZM:'ZMW', ZW:'ZWL'
};

// Currency code -> ISO2 country whose flag represents it.
export const CURRENCY_TO_FLAG_COUNTRY = {
	AED:'AE', AFN:'AF', ALL:'AL', AMD:'AM', ANG:'CW', AOA:'AO', ARS:'AR', AUD:'AU', AWG:'AW',
	AZN:'AZ', BAM:'BA', BBD:'BB', BDT:'BD', BGN:'BG', BHD:'BH', BIF:'BI', BMD:'BM', BND:'BN',
	BOB:'BO', BRL:'BR', BSD:'BS', BTN:'BT', BWP:'BW', BYN:'BY', BZD:'BZ', CAD:'CA', CDF:'CD',
	CHF:'CH', CLP:'CL', CNY:'CN', COP:'CO', CRC:'CR', CUP:'CU', CVE:'CV', CZK:'CZ', DJF:'DJ',
	DKK:'DK', DOP:'DO', DZD:'DZ', EGP:'EG', ERN:'ER', ETB:'ET', EUR:'EU', FJD:'FJ', FKP:'FK',
	GBP:'GB', GEL:'GE', GHS:'GH', GIP:'GI', GMD:'GM', GNF:'GN', GTQ:'GT', GYD:'GY', HKD:'HK',
	HNL:'HN', HRK:'HR', HTG:'HT', HUF:'HU', IDR:'ID', ILS:'IL', INR:'IN', IQD:'IQ', IRR:'IR',
	ISK:'IS', JMD:'JM', JOD:'JO', JPY:'JP', KES:'KE', KGS:'KG', KHR:'KH', KMF:'KM', KPW:'KP',
	KRW:'KR', KWD:'KW', KYD:'KY', KZT:'KZ', LAK:'LA', LBP:'LB', LKR:'LK', LRD:'LR', LSL:'LS',
	LYD:'LY', MAD:'MA', MDL:'MD', MGA:'MG', MKD:'MK', MMK:'MM', MNT:'MN', MOP:'MO', MRU:'MR',
	MUR:'MU', MVR:'MV', MWK:'MW', MXN:'MX', MYR:'MY', MZN:'MZ', NAD:'NA', NGN:'NG', NIO:'NI',
	NOK:'NO', NPR:'NP', NZD:'NZ', OMR:'OM', PAB:'PA', PEN:'PE', PGK:'PG', PHP:'PH', PKR:'PK',
	PLN:'PL', PYG:'PY', QAR:'QA', RON:'RO', RSD:'RS', RUB:'RU', RWF:'RW', SAR:'SA', SBD:'SB',
	SCR:'SC', SDG:'SD', SEK:'SE', SGD:'SG', SHP:'SH', SLE:'SL', SOS:'SO', SRD:'SR', SSP:'SS',
	STN:'ST', SYP:'SY', SZL:'SZ', THB:'TH', TJS:'TJ', TMT:'TM', TND:'TN', TOP:'TO', TRY:'TR',
	TTD:'TT', TWD:'TW', TZS:'TZ', UAH:'UA', UGX:'UG', USD:'US', UYU:'UY', UZS:'UZ', VES:'VE',
	VND:'VN', VUV:'VU', WST:'WS', XAF:'CM', XCD:'AG', XOF:'SN', XPF:'PF', YER:'YE', ZAR:'ZA',
	ZMW:'ZM', ZWL:'ZW'
};

// Currency code -> display symbol; falls back to "<CODE> " when there is no common glyph.
export const CURRENCY_TO_SYMBOL = {
	USD:'$', CAD:'$', AUD:'$', NZD:'$', SGD:'$', HKD:'$', MXN:'$', ARS:'$', CLP:'$', COP:'$',
	NAD:'$',
	INR:'₹', NPR:'₨', PKR:'₨', LKR:'₨', SCR:'₨',
	GBP:'£', EGP:'£',
	EUR:'€',
	JPY:'¥', CNY:'¥',
	KRW:'₩',
	VND:'₫',
	THB:'฿',
	PHP:'₱',
	NGN:'₦',
	GHS:'₵',
	ILS:'₪',
	TRY:'₺',
	UAH:'₴',
	RUB:'₽',
	KZT:'₸',
	PLN:'zł',
	CZK:'Kč',
	HUF:'Ft',
	SEK:'kr', NOK:'kr', DKK:'kr', ISK:'kr',
	CHF:'Fr',
	BRL:'R$',
	ZAR:'R'
};

export function getCurrencyDisplaySymbol(currencyCode) {
  return CURRENCY_TO_SYMBOL[currencyCode] || `${currencyCode} `;
}

export function formatMoneyWithCommas(amount) {
  return Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
