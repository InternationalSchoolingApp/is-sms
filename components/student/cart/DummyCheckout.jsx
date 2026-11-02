"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";

const INR_RATE = 98.2304;
const REDIRECT_SECONDS = 5;
const COUNTRIES = ["India", "United States", "United Arab Emirates", "United Kingdom"];

const money = (value) => (parseFloat(value) || 0).toFixed(2);
const FIELD = "h-10 w-full bg-transparent px-3 text-[15px] text-slate-600 outline-none";

function SuccessPage({ amount, studentName, logoUrl, onDone }) {
  const [count, setCount] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setCount((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (count === 0) onDone();
  }, [count, onDone]);

  return (
    <main className="flex min-h-full flex-col items-center px-5 pb-14 pt-8 text-gray-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt="International Schooling" className="mx-auto mb-9 w-[90%] max-w-[330px] sm:mb-14" />
      <section className="m-auto w-full max-w-[860px] text-center">
        <div className="mb-6 inline-flex h-28 w-28 items-center justify-center rounded-full bg-green-600 text-white shadow-[0_14px_32px_rgba(22,163,74,.22)]">
          <Check className="h-16 w-16" strokeWidth={3} />
        </div>
        <h1 className="mb-2 text-[34px] font-bold text-green-600 sm:text-[42px]">Thank You!</h1>
        <h2 className="mb-4 text-[25px] font-bold text-gray-900 sm:text-[30px]">Payment Successful</h2>
        <h3 className="mb-2.5 text-[22px] font-bold text-[#027fff]">Dear {studentName}</h3>
        <p className="mb-7 text-xl font-bold italic">Greetings from International Schooling!</p>
        <p className="mx-auto mb-3 max-w-[760px] text-base leading-relaxed text-gray-700 sm:text-lg">
          We confirm your online payment of <strong>${money(amount)}</strong> is completed successfully.
        </p>
        <p className="mx-auto mb-3 max-w-[760px] text-base leading-relaxed text-gray-700 sm:text-lg">
          Kindly refer to the fee details in your profile for the receipt.
        </p>
        <p className="mt-5 text-gray-500">
          Redirecting to dashboard in <strong className="text-[#027fff]">{count}</strong> seconds.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-7 inline-block rounded-md bg-[#027fff] px-8 py-3 text-[17px] font-bold text-white shadow-[0_4px_12px_rgba(2,127,255,.22)]"
        >
          Click here for Dashboard
        </button>
      </section>
      <div className="mt-14 text-[15px] text-gray-600">Copyright &copy; {new Date().getFullYear()} - International Schooling - All Rights Reserved.</div>
    </main>
  );
}

/**
 * Dummy (demo) student checkout — legacy renderDummyStripeCheckoutPage / renderDummyPaymentSuccessPage
 * in dummyStudentDashboardData.js: a look-alike Stripe (or Airwallex) page whose Pay shows the
 * "Payment Successful" page, which then empties the dummy cart and returns to the dashboard
 * (legacy dummyGoToDashboard). Nothing is charged and nothing reaches the backend.
 */
export function DummyCheckout({ gateway, student, email, logoUrl, onBack, onDone }) {
  const [paid, setPaid] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [amount] = useState(() => student.checkoutAmount());
  const inr = amount * INR_RATE;
  const fee = currency === "INR" ? `Rs ${money(inr)}` : `US$${money(amount)}`;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white font-sans text-[#30313d]">
      {paid ? (
        <SuccessPage amount={amount} studentName={student.userName()} logoUrl={logoUrl || student.imageUrl("logo.png")} onDone={onDone} />
      ) : (
        <div className="relative mx-auto grid min-h-full max-w-[380px] grid-cols-1 gap-10 px-5 py-8 lg:max-w-none lg:grid-cols-[380px_380px] lg:justify-center lg:gap-x-40 lg:px-0 lg:pt-14">
          <div aria-hidden="true" className="fixed inset-y-0 left-1/2 hidden w-px bg-[#f1f3f5] lg:block" />
          <section className="relative bg-white">
            <div className="flex items-center whitespace-nowrap font-semibold">
              <button type="button" onClick={onBack} aria-label="Back" className="mr-3 text-[#aab1bd]">
                <ChevronLeft className="h-6 w-6" strokeWidth={3} />
              </button>
              <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1685fe] text-[17px] text-white">i</span>
              <span className="truncate">INTERNATIONAL SCHOOLING</span>
              <span className="ml-2.5 rounded-[5px] bg-[#16335a] px-2.5 py-1 text-sm font-bold text-white">Sandbox</span>
            </div>
            <div className="mt-10 text-lg font-semibold lg:mt-20">Choose a currency:</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                ["INR", "IN", `Rs ${money(inr)}`],
                ["USD", "US", `US$${money(amount)}`],
              ].map(([code, flag, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  aria-pressed={currency === code}
                  className={`flex h-12 min-w-0 items-center rounded-md border bg-white px-3 text-base font-semibold sm:px-4 sm:text-xl ${
                    currency === code ? "border-[#30313d] shadow-[inset_0_0_0_1px_#30313d]" : "border-[#e6e8eb]"
                  }`}
                >
                  <span className="mr-2 text-sm text-slate-500">{flag}</span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
            <div className="mt-2.5 text-sm text-[#697386]">
              1 USD = {INR_RATE} INR <span className="underline decoration-dotted">(includes 3.75% conversion fee)</span>
            </div>
            <div className="mt-10 flex justify-between font-semibold lg:mt-16">
              <span>Extra Class Fee</span>
              <span>{fee}</span>
            </div>
          </section>

          <section className="relative bg-white">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="h-14 rounded-[5px] bg-black text-2xl font-bold text-white">Apple Pay</button>
              <button type="button" className="h-14 rounded-[5px] bg-[#00d66f] text-2xl font-bold text-[#001b44]">link</button>
            </div>
            <div className="my-7 flex items-center gap-3 text-sm text-[#8a8f98] before:h-px before:flex-1 before:bg-[#e6e8eb] after:h-px after:flex-1 after:bg-[#e6e8eb]">
              OR
            </div>
            <h3 className="mb-4 text-[17px] font-semibold">Contact information</h3>
            <label className="mb-8 flex h-[52px] items-center rounded-md border border-slate-200 bg-[#fafafa] px-4 shadow-sm">
              <span className="w-[88px] shrink-0 text-gray-500">Email</span>
              <input type="email" defaultValue={email} placeholder="Email" className="w-full bg-transparent text-[15px] text-gray-600 outline-none" />
            </label>
            <h3 className="mb-4 text-[17px] font-semibold">Payment method</h3>
            <div className="mb-5 rounded-lg border border-slate-200 px-4 py-4 shadow-sm">
              <div className="mb-6 flex items-center gap-3 font-semibold">
                <span className="relative inline-block h-[13px] w-[18px] rounded-sm bg-gray-900 after:absolute after:inset-x-0 after:top-1 after:h-[3px] after:bg-white" />
                Card
              </div>
              <div className="mb-2 text-sm font-medium text-gray-600">Card information</div>
              <div className="mb-5 overflow-hidden rounded-md border border-slate-200 shadow-sm">
                <div className="flex items-center border-b border-slate-200 pr-3">
                  <input type="text" inputMode="numeric" maxLength={19} placeholder="1234 1234 1234 1234" className={FIELD} />
                  <span className="flex shrink-0 items-center gap-1">
                    {["visa.png", "master-card.png", "american-express.png", "JCB-Pay.png"].map((file) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={file} src={student.imageUrl(file)} alt="" className="h-4 w-[25px] rounded-sm object-contain" />
                    ))}
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  <input type="text" inputMode="numeric" maxLength={5} placeholder="MM / YY" className={FIELD} />
                  <input type="text" inputMode="numeric" maxLength={4} placeholder="CVC" className={`${FIELD} border-l border-slate-200`} />
                </div>
              </div>
              <div className="mb-2 text-sm font-medium text-gray-600">Cardholder name</div>
              <input type="text" placeholder="Full name on card" className={`${FIELD} mb-5 rounded-md border border-slate-200 shadow-sm`} />
              <div className="mb-2 text-sm font-medium text-gray-600">Country or region</div>
              <select className={`${FIELD} rounded-md border border-slate-200 text-[#30313d] shadow-sm`}>
                {COUNTRIES.map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </select>
            </div>
            <label className="mb-6 flex gap-2.5 rounded-lg border border-slate-200 px-3.5 py-3 text-[15px] text-gray-500 shadow-sm">
              <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0" />
              <span>
                <strong className="font-semibold text-gray-600">Save my information for faster checkout</strong>
                <br />
                Pay securely at INTERNATIONAL SCHOOLING and everywhere Link is accepted.
              </span>
            </label>
            <button
              type="button"
              onClick={() => setPaid(true)}
              className="h-14 w-full rounded-md bg-[#0878d9] text-[17px] font-bold text-[#b9ddff] shadow"
            >
              Pay
            </button>
            <div className="mt-4 text-center text-xs text-[#8a8f98]">
              Powered by <strong className="text-gray-500">{gateway === "Airwallex" ? "airwallex" : "stripe"}</strong> &nbsp;|&nbsp; Terms &nbsp; Privacy
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
