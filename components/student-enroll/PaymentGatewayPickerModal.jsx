"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowRightLeft, ChevronRight, CircleCheckBig, Info, ShieldCheck, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import {
  CURRENCY_TO_FLAG_COUNTRY,
  FLAG_COUNTRY_TO_CURRENCY,
  formatMoneyWithCommas,
  getCurrencyDisplaySymbol,
} from "@/utils/currencyDisplay";

/**
 * "Choose Your Payment Method" modal — port of getPaymentGatewayOptionsModal()
 * (#paymentOptionsModal) in commonPaymentGateway.js. Left: one tab per gateway
 * the options call returned, plus the "Secure & Trusted" box. Right: title,
 * the fee label, the local-currency "Payment Amount" card (when a conversion
 * exists) and the active gateway's panel with Back / Pay Now.
 *
 * `details` is the raw `details` of common/payment-gateway/options
 * (PaymentOptionDetails): paymentOptions [{name, label, icon, additionalFee,
 * additionalDetails}], paymentLabel, payAmount, payAmountWithCurrency,
 * currencyConversion, schoolNameOfPaymentGateway. `airwallexMethods` is
 * get-airwallex-payment-methods' `methods` list.
 *
 * Callbacks (from Stage4ReviewPayment):
 *   onPay(option)                       online gateways' Pay Now / method tiles
 *   onUploadProof(file, spec)           -> { fileName } | { error }
 *   onSubmitOffline(option, form, spec) -> { ok, message }   (CASH / WIRETRANSFER)
 */

// Backend static assets (legacy PATH_FOLDER_IMAGE2 / PATH_FOLDER_FONT2).
const IMAGES = "static/theme2/images/";
const FLAGS = "static/theme2/fonts/";
const assetUrl = (folder, file) => `${resolveBackendOrigin()}/${folder}${file}`;

// Gateways with no Pay Now button here: YOCO's is hidden (its own SDK flow), offline ones submit a form.
const NO_PAY_BUTTON = ["YOCO", "CASH", "WIRETRANSFER"];
const OFFLINE = ["CASH", "WIRETRANSFER"];

// bindFileUploadNew1(index, category, ...) arguments per offline gateway, and which id
// initiateOfflinePayment() sends as the paying user (WIRETRANSFER: details.userId,
// CASH: details.paidByUserId) — exactly as getPaymentGatewayOptionsModal() wires them.
const OFFLINE_SPEC = {
  CASH: { uploadIndex: "8", uploadCategory: "32", payerKey: "paidByUserId" },
  WIRETRANSFER: { uploadIndex: "9", uploadCategory: "33", payerKey: "userId" },
};

// jquery-fileupload add(): jpg/jpeg/png/pdf only, max 5 MB (MAX_SIZE_LIMIT).
const ACCEPTED_TYPES = /^(image\/(png|jpe?g)|application\/pdf)$/i;
const MAX_PROOF_BYTES = 5767168;

function PaymentLabel({ children }) {
  return String(children ?? "")
    .split(/(<sup>.*?<\/sup>)/gi)
    .map((part, index) => {
      const match = part.match(/^<sup>(.*?)<\/sup>$/i);
      return match ? <sup key={index}>{match[1]}</sup> : part;
    });
}

function tabIcon(option) {
  return option.icon === "Airwallex.png" ? "airwallex_icon.png" : option.icon;
}

function Flag({ country, alt }) {
  if (!country) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={assetUrl(FLAGS, `${country}.svg`)} alt={alt} className="h-6 w-8 shrink-0 rounded-sm object-cover" />;
}

function CurrencyCard({ details, payerCountryCode }) {
  const conversion = details.currencyConversion;
  if (!conversion || conversion.status !== "success" || !conversion.to || conversion.to === conversion.base) return null;

  // A country's own flag beats the currency's generic one when its currency matches (e.g. Spain vs. Eurozone).
  const payerCountry = payerCountryCode ? String(payerCountryCode).toUpperCase() : "";
  const localFlag =
    payerCountry && CURRENCY_TO_FLAG_COUNTRY[conversion.to] && FLAG_COUNTRY_TO_CURRENCY[payerCountry] === conversion.to
      ? payerCountry
      : CURRENCY_TO_FLAG_COUNTRY[conversion.to];
  const baseFlag = CURRENCY_TO_FLAG_COUNTRY[conversion.base];
  const fee = details.paymentOptions?.[0]?.additionalFee || 0;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Info className="h-4 w-4" /> Payment Amount
      </div>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center">
        {/* Both amount boxes share the row equally below md (min-w-0 lets them shrink instead of the text
            spilling out) and have the same structure: flag + amount over its currency code. */}
        <div className="flex w-full items-center gap-2 md:w-auto md:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 md:flex-none md:px-3">
            <Flag country={localFlag} alt={conversion.to} />
            <div className="min-w-0 leading-tight">
              <span className="block break-words text-[13px] font-semibold sm:text-base">
                {getCurrencyDisplaySymbol(conversion.to)}
                {formatMoneyWithCommas(details.payAmountWithCurrency)}
              </span>
              <small className="block text-xs text-slate-500">({conversion.to})</small>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 md:flex-none md:px-3">
            <Flag country={baseFlag} alt={conversion.base} />
            <div className="min-w-0 leading-tight">
              <span className="block break-words text-[13px] font-semibold sm:text-base">
                {getCurrencyDisplaySymbol(conversion.base)}
                {formatMoneyWithCommas(details.payAmount)}
              </span>
              <small className="block text-xs text-slate-500">({conversion.base})</small>
            </div>
          </div>
        </div>
        <div className="hidden h-12 w-px bg-blue-100 md:block" />
        <div className="text-sm">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <ArrowRightLeft className="h-4 w-4" /> Conversion Rate
          </div>
          <div className="mt-1 font-bold text-slate-900">
            1 {conversion.base} = {conversion.rate} {conversion.to}
          </div>
          <div className="mt-1 flex items-start gap-1 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Exchange rate and fees of your bank may apply{fee > 0 ? ` (includes ${fee}% conversion fee)` : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodTile({ image, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 transition hover:border-primary hover:shadow disabled:opacity-60 sm:w-36"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="max-h-12 max-w-full object-contain" />
      ) : null}
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

function CardTiles({ option, onPay, disabled }) {
  const pay = () => onPay(option);
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <MethodTile image={assetUrl(IMAGES, "visa.png")} label="Visa" onClick={pay} disabled={disabled} />
      <MethodTile image={assetUrl(IMAGES, "master-card.png")} label="Mastercard" onClick={pay} disabled={disabled} />
      {option.name === "AFS" && (
        <MethodTile image={assetUrl(IMAGES, "american-express.png")} label="Amex" onClick={pay} disabled={disabled} />
      )}
    </div>
  );
}

/**
 * Cash / Wire Transfer form — the #cashPaymentForm / #wirePaymentForm blocks: Payable Fee
 * (read-only), Reference Number, Proof of Payment upload, Submit. Submit follows
 * initiateOfflinePayment() -> the "Confirmation!" modal -> callOfflinePayment().
 */
function OfflineForm({ option, details, onUploadProof, onSubmitOffline, busy }) {
  const spec = OFFLINE_SPEC[option.name];
  const [referenceNumber, setReferenceNumber] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const currency = details.currencyConversion?.base || "USD";
  const working = uploading || submitting || busy;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage(null);
    if (!ACCEPTED_TYPES.test(file.type)) {
      setMessage("Please upload files in following formats (jpg, jpeg, pdf or png).");
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setMessage("Please upload maximum 5MB file in size.");
      return;
    }
    setUploading(true);
    const result = await onUploadProof(file, { ...spec, uploadUserId: details.userId });
    setUploading(false);
    if (result?.error) setMessage(result.error);
    else setFileName(result.fileName);
  }

  // initiateOfflinePayment(): both fields are required before the confirmation step.
  function submit() {
    setMessage(null);
    if (!referenceNumber.trim()) {
      setMessage("Reference Number is required");
      return;
    }
    if (!fileName) {
      setMessage("Proof of Payment required");
      return;
    }
    setConfirming(true);
  }

  async function confirm() {
    setConfirming(false);
    setSubmitting(true);
    const result = await onSubmitOffline(
      option,
      { referenceNumber: referenceNumber.trim(), fileName },
      { paymentByUserId: details[spec.payerKey] }
    );
    setSubmitting(false);
    if (!result?.ok) setMessage(result?.message || "Something went wrong. Please try again.");
  }

  if (confirming) {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h4 className="text-base font-semibold text-slate-900">Confirmation!</h4>
        <p className="mt-2 text-sm text-slate-700">
          Are you sure you want to submit this reference number? Once submitted, you won’t be able to change this number
          again.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button type="button" onClick={confirm} className="bg-green-600 hover:bg-green-700">
            Yes
          </Button>
          <Button type="button" variant="destructive" onClick={() => setConfirming(false)}>
            No
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 text-sm">
      <div>
        <label className="mb-1 block font-medium text-slate-700">
          Payable Fee &nbsp;<b>{currency}</b>
        </label>
        <Input value={details.payAmount ?? ""} disabled readOnly className="h-10 bg-slate-50" />
      </div>
      <div>
        <label className="mb-1 block font-medium text-slate-700">Reference Number</label>
        <Input
          value={referenceNumber}
          maxLength={150}
          placeholder="Reference Number"
          onChange={(e) => {
            setReferenceNumber(e.target.value);
            setMessage(null);
          }}
          className="h-10 bg-white"
        />
      </div>
      <div>
        <label className="mb-1 block font-medium text-slate-700">Proof of Payment</label>
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-white ${working ? "pointer-events-none opacity-60" : ""}`}
          >
            {uploading ? "Uploading…" : "Upload Proof of Payment"}
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFile} disabled={working} />
          </label>
          {fileName && (
            <span className="flex items-center gap-2 text-slate-700">
              {fileName}
              <button type="button" aria-label="Remove file" onClick={() => setFileName("")} className="text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Please upload files in following formats (jpg, jpeg, pdf or png) with maximum size of 5 MB
        </p>
      </div>
      {message && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {message}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={working} className="px-6">
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}

// Back / Pay Now action row — rendered by the parent in a sticky footer so it
// stays pinned to the bottom of the modal while the panel above it scrolls.
function GatewayActions({ option, busy, onPay, onClose }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      {!NO_PAY_BUTTON.includes(option.name) && (
        <Button type="button" onClick={() => onPay(option)} disabled={busy} className="gap-2 px-6">
          {busy ? "Please wait…" : "Pay Now"} <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function GatewayPanel({ option, details, airwallexMethods, busy, onPay, onClose, onUploadProof, onSubmitOffline }) {
  const pay = () => onPay(option);
  const hasBanner = ["STRIPE", "Airwallex", "YOCO", "WIRETRANSFER", "CONVERA", "AFS", "CASH"].includes(option.name);
  const instructions = option.additionalDetails ?? option.addtionalDetails; // backend spells it both ways

  return (
    <div>
      {hasBanner && (
        <div className="rounded-xl bg-slate-100 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetUrl(IMAGES, option.icon)} alt={option.label} className="h-9 max-w-[220px] object-contain object-left" />
        </div>
      )}

      {["STRIPE", "YOCO", "AFS"].includes(option.name) && <CardTiles option={option} onPay={onPay} disabled={busy} />}

      {option.name === "Airwallex" && (
        <div className="mt-4 flex flex-wrap gap-3">
          {(airwallexMethods || []).length === 0 && <p className="text-sm text-slate-500">No Payment Methods Available</p>}
          {(airwallexMethods || []).map((method, index) => (
            <MethodTile
              key={index}
              image={method.image ? assetUrl(`${IMAGES}payment-gateway/`, method.image) : null}
              label={method.labelName}
              onClick={pay}
              disabled={busy}
            />
          ))}
        </div>
      )}

      {option.name === "CONVERA" && (
        <div className="mt-4 text-sm text-slate-700">
          {instructions && <div dangerouslySetInnerHTML={{ __html: instructions }} />}
          <h3 className="mt-3 font-semibold text-slate-900">
            Pay money from the comfort of your own home - Reliable, convenient international money transfer using your
            home/local currency
          </h3>
          <ul className="mt-3 space-y-3">
            <li>
              <h4 className="font-semibold">Step 1</h4>
              <strong>Select your preferred currency and click on Get Quote</strong>
            </li>
            <li>
              <h4 className="font-semibold">Step 2</h4>
              <strong>Verify your details – Student Name, Registered Email.</strong>
            </li>
            <li>
              You can use a wide variety of services to complete your transactions. You can pay with your bank account
              or a credit/debit card* or use cash at your nearest in-person Convera agent location.
            </li>
          </ul>
          <CardTiles option={option} onPay={onPay} disabled={busy} />
        </div>
      )}

      {option.name === "WIRETRANSFER" && (
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {instructions ? (
            <div dangerouslySetInnerHTML={{ __html: instructions }} />
          ) : (
            <>
              <p>Here are the banking instructions for your payment:</p>
              <ul className="list-disc pl-5">
                <li>
                  <strong>Provide your bank details</strong>
                </li>
              </ul>
            </>
          )}
          <p>
            Please clearly identify Student Name and City/State/Country in the reference information that accompanies the
            bank transfer, so that we can properly credit your account.
          </p>
          <p>
            Your SMS profile will be created after the complete payment is processed in{" "}
            {details.schoolNameOfPaymentGateway}&apos;s bank Account
          </p>
        </div>
      )}

      {OFFLINE.includes(option.name) && (
        <OfflineForm
          option={option}
          details={details}
          onUploadProof={onUploadProof}
          onSubmitOffline={onSubmitOffline}
          busy={busy}
        />
      )}
    </div>
  );
}

export function PaymentGatewayPickerModal({
  open,
  onOpenChange,
  details,
  airwallexMethods,
  payerCountryCode,
  schoolNumericId,
  schoolName,
  busy,
  onPay,
  onUploadProof,
  onSubmitOffline,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const options = details?.paymentOptions || [];
  const active = options[Math.min(activeIndex, Math.max(options.length - 1, 0))];
  const subHeading =
    Number(schoolNumericId) === 1
      ? "Powered by trusted global payment gateways for a secure and seamless experience."
      : `${details?.schoolNameOfPaymentGateway || schoolName || "Our school"} is trusted by the safest and most reputed payment gateway and bank`;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogTitle className="sr-only">Choose Your Payment Method</DialogTitle>
        {/* Fills the dialog's remaining height; each column scrolls independently so the
            Pay Now / Back bar below can stay pinned to the bottom instead of scrolling away. */}
        <div className="grid flex-1 overflow-hidden md:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-b border-slate-200 bg-white p-5 md:border-r md:border-b-0">
            <div className="md:hidden">
              <h3 className="text-xl font-extrabold text-slate-900">Choose Your Payment Method</h3>
              <p className="mt-1 text-sm text-slate-500">{subHeading}</p>
            </div>
            <ul className="mt-4 space-y-3 md:mt-0" role="tablist">
              {options.map((option, index) => {
                const selected = index === activeIndex;
                return (
                  <li key={option.name} role="presentation">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveIndex(index)}
                      className={`relative flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-semibold transition ${
                        selected ? "border-primary bg-primary text-white shadow" : "border-slate-200 bg-white text-slate-800 hover:border-primary/50"
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={assetUrl(IMAGES, tabIcon(option))} alt="" className="max-h-7 max-w-7 object-contain" />
                      </span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <ChevronRight className="absolute -right-3 hidden h-5 w-5 rounded-full bg-primary text-white md:block" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-primary" /> Secure &amp; Trusted
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {["SSL Encrypted", "PCI-DSS Certified", "Global Payment Gateways"].map((text) => (
                  <li key={text} className="flex items-center gap-2">
                    <CircleCheckBig className="h-5 w-5 text-green-500" /> {text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Right column: scrollable payment-option content on top, Back / Pay Now
              pinned in a sticky footer below so it's always reachable without scrolling. */}
          <section className="flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              <div className="hidden md:block">
                <h3 className="text-3xl font-extrabold text-slate-900">Choose Your Payment Method</h3>
                <p className="mt-2 text-slate-600">{subHeading}</p>
              </div>
              {details?.paymentLabel && (
                <p className="mt-5 text-lg font-semibold text-slate-800">
                  <PaymentLabel>{details.paymentLabel}</PaymentLabel>
                </p>
              )}
              <div className="mt-3">
                <CurrencyCard details={details || {}} payerCountryCode={payerCountryCode} />
              </div>
              <div className="mt-5">
                {active && (
                  <GatewayPanel
                    key={active.name}
                    option={active}
                    details={details}
                    airwallexMethods={airwallexMethods}
                    busy={busy}
                    onPay={onPay}
                    onClose={() => onOpenChange(false)}
                    onUploadProof={onUploadProof}
                    onSubmitOffline={onSubmitOffline}
                  />
                )}
              </div>
            </div>
            {active && (
              <div className="shrink-0 border-t border-slate-200 bg-white p-5 sm:px-8">
                <GatewayActions option={active} busy={busy} onPay={onPay} onClose={() => onOpenChange(false)} />
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
