import ResourceManager from "../../components/ResourceManager.jsx";

export default function Employees({ user }) {
  return <ResourceManager page="employees" user={user} />;
}
