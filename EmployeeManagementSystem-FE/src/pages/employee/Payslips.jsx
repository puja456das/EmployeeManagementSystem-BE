import ResourceManager from "../../components/ResourceManager.jsx";

export default function Payslips({ user }) {
  return <ResourceManager page="payroll" user={user} />;
}
