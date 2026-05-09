interface PermissionProps {
  name: string;
  description: string;
  id: string;
}

export const permissions: PermissionProps[] = [
  {
    id: "users.read",
    name: "users.read",
    description: "Read users",
  },
  {
    id: "users.create",
    name: "users.create",
    description: "Create users",
  },
  {
    id: "users.update",
    name: "users.update",
    description: "Update users",
  },
  {
    id: "users.delete",
    name: "users.delete",
    description: "Delete users",
  },
];
