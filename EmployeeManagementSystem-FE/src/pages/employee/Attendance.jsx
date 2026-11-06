import ResourceManager from "../../components/ResourceManager.jsx";

export default function Attendance({ user }) {
  return <ResourceManager page="attendance" user={user} />;
}
