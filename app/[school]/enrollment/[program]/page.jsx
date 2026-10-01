import { AccountCreationForm } from "./AccountCreationForm";

// This route (/{school}/enrollment/{program}) is flat — no {schoolId} path
// segment. Unlike /step/1,2,3 (which get schoolUUID from the Auth.js session
// post-login), this page runs BEFORE any login, so there's no session yet —
// schoolUUID comes from the {school} path segment and the public bootstrap
// fetch is driven client-side (browser session cookie + gateway redirects),
// in AccountCreationForm.
//
// Server Component: it only resolves the route params/query (Next 16 async
// params + searchParams) and hands them to the client form as plain props.
function searchParamsToQueryString(searchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    // Next passes repeated query keys as arrays — preserve every occurrence,
    // since the backend reads payload/referralCode/ras/v from the raw query.
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value !== undefined) query.append(key, value);
  }
  return query.toString();
}

export default async function AccountCreationPage({ params, searchParams }) {
  const { school, program } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <AccountCreationForm
      school={school}
      program={program}
      query={searchParamsToQueryString(resolvedSearchParams)}
    />
  );
}
