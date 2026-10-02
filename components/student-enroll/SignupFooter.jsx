// Mirrors SignupCommon.jsp's mobile `.fixed-footer` (WhatsApp support bar +
// copyright) — see src/main/webapp/WEB-INF/views/theme2/SignupCommon.jsp in
// is-rest-api. The JSP only renders this when the school has
// whatsAppCode+whatsAppContact configured; those aren't wired into the
// frontend context yet, so whatsAppNumber is a plain env-driven value for
// now (see .env.local.example) — same TODO-until-real-backend-wiring
// pattern as SIGNUP_CONTEXT in page.jsx.
export function SignupFooter({ whatsAppNumber, schoolName }) {
  const copyrightYear = new Date().getFullYear();

  return (
    <div id="signupMobileFooter" className="md:hidden fixed bottom-0 left-0 z-20 w-full bg-white">
      {whatsAppNumber && (
        <a
          href={`https://api.whatsapp.com/send?phone=${whatsAppNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2  py-3 text-sm font-bold text-white"
          style={{ background: "#25D366" }}
        >
          Enrollment Support on
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="#fff">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8zm4.7 10.3c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1 2.1-.4 3.4a11 11 0 0 0 4.5 4.5c1.9.9 2.7.8 3.4.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3z" />
          </svg>
          WhatsApp
        </a>
      )}
      <p className="bg-white-900 py-2 text-center text-xs text-black">
        Copyright © {copyrightYear} - {schoolName} - All Rights Reserved.
      </p>
    </div>
  );
}
