"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { AlertTriangle, Clock, CreditCard, FileText, Globe, Info } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { PaymentName } from "@/components/common/PaymentName";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { CheckoutExtraDialogs } from "@/components/common/CheckoutExtraDialogs";
import { ActionButton, Card, SupportCard } from "@/components/re-enrollment/ReEnrollmentParts";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useCartCheckout } from "@/hooks/useCartCheckout";
import { useSchoolCurrency } from "@/hooks/useStudentCart";
import { ONBOARDING_STATUS_KEY } from "@/hooks/useOnboardingGate";
import { getWelcomeDetails, saveTimezone } from "@/services/onboardingGateApi";
import { callServer } from "@/utils/serverCall";
import { useLabelTranslator } from "@/i18n/labels";

/**
 * Welcome page (/{school}/student/welcome) - the legacy "additional layer" (AdditionalLayerAtLogin.jsp +
 * additionalLayer.js) a student sees before the dashboard. One screen at a time, legacy order:
 *   1. Payment overdue: the overdue fee cards, Pay Now on the first one (the cart's checkout chain)
 *   2. Confirm Your Time Zone: pick the zone, confirm "all of your classes will follow this time zone"
 * When nothing is left the student goes to /{school}/student, where the dashboard gate takes over (it sends
 * a student with Dashboard Setup still to do on to that).
 */

const welcomeKey = (context) => ["onboarding-welcome", context?.schoolUUID, context?.userId];

export function OnboardingWelcome() {
  const t = useTranslations("onboarding.welcome");
  const tc = useTranslations("common");
  const { context } = useDashboardContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dummy = useDummyStudent();
  const live = Boolean(context && dummy.settled && !dummy.enabled);

  const query = useQuery({
    queryKey: welcomeKey(context),
    queryFn: () => callServer(() => getWelcomeDetails()),
    enabled: live,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const data = query.data;
  const step = !data ? null : data.paymentOverDue ? "overdue" : data.timezone ? "timezone" : "done";
  // Dummy mode has no welcome steps. "done" also covers the Azure user layer (no Next.js screen): back on
  // /student the gate sends it to the legacy page.
  const leaving = (dummy.settled && dummy.enabled) || step === "done";

  useEffect(() => {
    if (!leaving || !context) return;
    // The gate cached "pending" for this tab: drop it so the dashboard checks again.
    queryClient.removeQueries({ queryKey: [ONBOARDING_STATUS_KEY] });
    router.replace(`/${context.schoolUUID}/student`);
  }, [leaving, context, queryClient, router]);

  if (query.isError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm font-semibold text-red-600">{t("loadFailed")}</p>
        <ActionButton onClick={() => query.refetch()}>{tc("actions.tryAgain")}</ActionButton>
      </div>
    );
  }
  if (!live || query.isPending || leaving) return <FullScreenLoader />;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4">
      {step === "overdue" && <OverdueStep context={context} dueFees={data.dueFees} onPaid={() => query.refetch()} />}
      {step === "timezone" && (
        <TimezoneStep
          timezone={data.timezone}
          onSaved={() => {
            queryClient.removeQueries({ queryKey: [ONBOARDING_STATUS_KEY] });
            query.refetch();
          }}
        />
      )}
    </div>
  );
}

// ---- Confirm Your Time Zone (legacy timezoneCard + timezoneConfirmModal) ----

// Legacy btn-success. "!" because ActionButton already carries bg-primary (same specificity, CSS order wins).
const GREEN = "!bg-green-600 hover:!bg-green-700";

function TimezoneStep({ timezone, onSaved }) {
  const t = useTranslations("onboarding.timezone");
  const tc = useTranslations("common");
  const options = useMemo(() => timezone?.options ?? [], [timezone]);
  const [selected, setSelected] = useState(timezone?.selected || "");
  const [confirming, setConfirming] = useState(false);
  const zoneName = useMemo(() => {
    const label = options.find((o) => o.value === selected)?.label || "";
    return label.split(") - ")[1] || label;
  }, [options, selected]);

  const save = useMutation({
    mutationFn: () => callServer(() => saveTimezone(selected)),
    onSuccess: () => {
      setConfirming(false);
      toast.success(t("saved"));
      onSaved();
    },
    onError: (error) => toast.error(String(error?.message || "").replace(/^[A-Z0-9_]+: /, "") || t("saveFailed")),
  });

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card header={t("title")} className="w-full max-w-[650px]" bodyClassName="px-4 py-6 sm:px-8">
        <p className="mb-5 text-center text-base font-semibold text-primary">{t("intro")}</p>
        <div className="mx-auto max-w-md">
          <FloatingLabelSelect
            icon={Globe}
            label={t("label")}
            required
            value={selected}
            onValueChange={setSelected}
            options={options}
            error={options.length === 0 ? t("loadFailed") : undefined}
            searchable
          />
        </div>
        <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
          <ActionButton className={GREEN} disabled={!selected} onClick={() => setConfirming(true)}>
            {tc("actions.confirm")}
          </ActionButton>
        </div>
      </Card>

      <Dialog open={confirming} onOpenChange={(open) => !save.isPending && setConfirming(open)}>
        <DialogContent className="border-t-[10px] border-primary text-center sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold text-primary">
              {t.rich("proceedWith", { zone: zoneName, b: (chunks) => <b className="font-bold">{chunks}</b> })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm font-semibold text-primary">{t("classesFollow")}</p>
          <p className="text-sm font-semibold text-primary">
            {t.rich("changeLater", { b: (chunks) => <b>{chunks}</b> })}
          </p>
          <div className="mt-2 flex justify-center gap-2">
            <ActionButton className={GREEN} disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? t("saving") : tc("actions.yes")}
            </ActionButton>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => setConfirming(false)}
              className="cursor-pointer rounded-md border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
            >
              {tc("actions.no")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Payment overdue (legacy paymentOverDueCard) ----

function OverdueStep({ context, dueFees, onPaid }) {
  const t = useTranslations("onboarding.overdue");
  const tr = useTranslations("reEnrollment.gateway");
  const tl = useLabelTranslator("onboarding.feeStatus");
  const currencyQuery = useSchoolCurrency(context.schoolNumericId);
  const symbol = currencyQuery.data?.symbol ?? "";
  const checkout = useCartCheckout({
    context,
    onPaid: () => {
      toast.success(t("paymentReceived"));
      onPaid();
    },
  });
  const firstDueDate = dueFees[0]?.dueDate || "-";
  const money = (n) => `${symbol} ${Number(n || 0).toFixed(2)}`.trim();

  return (
    <div className="pb-6">
      <h2 className="mb-4 text-center text-xl font-bold text-black">
        <span className="mr-2" aria-hidden="true">👋</span>{context.userName ? t("hi", { name: context.userName }) : t("hiThere")}
      </h2>
      <div className="mx-auto mb-6 flex max-w-xl items-center gap-3 rounded-[10px] border border-red-400 bg-red-50 px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm text-red-600 sm:text-base">{t("deactivated", { date: firstDueDate })}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          {dueFees.length === 0 && (
            <Card bodyClassName="px-4 py-6 text-center text-sm text-slate-600">{t("noOverdue")}</Card>
          )}
          {dueFees.map((fee, index) => (
            <section key={fee.id} className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-sm font-semibold text-black">
                <FileText className="h-4 w-4" aria-hidden="true" /> {t("pendingFee")}
              </header>
              <dl className="space-y-2 px-4 py-3 text-sm">
                <Row label={t("grade")} value={fee.standardName || "-"} />
                <Row label={t("feeDescription")} value={fee.paymentName ? <PaymentName name={fee.paymentName} /> : "-"} />
                <Row label={t("dueFee")} value={money(fee.amount)} />
                <Row label={t("dueDate")} value={fee.dueDate || "-"} danger />
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-slate-500">{t("status")}</dt>
                  <dd>
                    <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">{tl(fee.status) || "-"}</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
                  <dt className="font-semibold text-slate-500">{t("totalDue")}</dt>
                  <dd className="text-xl font-bold text-black">{money(fee.amount)}</dd>
                </div>
              </dl>
              <div className="px-4 pb-4 text-center">
                {/* Like legacy: only the earliest overdue fee can be paid first. */}
                <ActionButton disabled={index !== 0 || checkout.preparing} onClick={() => checkout.start(fee.id)} className="inline-flex items-center gap-2">
                  <CreditCard className="h-4 w-4" aria-hidden="true" /> {t("payNow")}
                </ActionButton>
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:col-span-5">
          <SupportCard uniqueId={context.uniqueId} />
          <div className="rounded-[10px] border border-amber-300 bg-amber-50 p-4 text-amber-700">
            <p className="mb-1 flex items-center gap-2 font-bold">
              <Clock className="h-4 w-4" aria-hidden="true" /> {t("whyTimely")}
            </p>
            <p className="text-sm">{t("payInAdvance")}</p>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-[10px] bg-blue-50 px-3 py-1 text-sm text-blue-700">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("avoidDeactivation")}
      </p>

      <CheckoutExtraDialogs checkout={checkout} />
      <PaymentGatewayPickerModal
        open={Boolean(checkout.picker)}
        onOpenChange={(open) => !open && checkout.closePicker()}
        details={checkout.picker?.details}
        airwallexMethods={checkout.picker?.methods}
        payerCountryCode={checkout.picker?.countryCode}
        schoolNumericId={context.schoolNumericId}
        schoolName={context.schoolName}
        busy={checkout.launching}
        onPay={checkout.launchGateway}
        onUploadProof={checkout.uploadProof}
        onSubmitOffline={checkout.submitOffline}
      />
      {(checkout.preparing || checkout.processing) && (
        <FullScreenLoader message={checkout.processing ? tr("processing") : undefined} />
      )}
      <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">{tr("oops")}</DialogTitle>
          </DialogHeader>
          <h3 className="text-lg font-semibold text-red-600">{tr("incomplete")}</h3>
        </DialogContent>
      </Dialog>
      <Dialog
        open={checkout.underReview}
        onOpenChange={(open) => {
          if (open) return;
          checkout.dismissUnderReview();
          onPaid();
        }}
      >
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle>{tr("underReview")}</DialogTitle>
          </DialogHeader>
          <p className="text-black/70">{t("statusUpdated")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, danger = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={`font-semibold ${danger ? "text-red-600" : "text-slate-500"}`}>{label}</dt>
      <dd className={`text-right font-semibold ${danger ? "text-red-600" : "text-black"}`}>{value}</dd>
    </div>
  );
}
