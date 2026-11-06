import ResourceManager from "../../components/ResourceManager.jsx";

export default function UserAccess({ user }) {
  return <ResourceManager page="users" user={user} />;
}
