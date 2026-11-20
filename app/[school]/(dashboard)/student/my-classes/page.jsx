import { MyClassesGate } from "./MyClassesGate";

// "My Classes": the Today / Week / Month planner. It is a database module (MODULES / USER_RIGHTS, see
// is-rest-api external-resource/feature/63_14_0_MY_CLASSES_MODULE.sql): a role that has it sees it in the menu and can open
// this page, any other student is sent to the dashboard home (MyClassesGate).
export default function MyClassesPage() {
  return <MyClassesGate />;
}
