import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MODULES } from "@/features/permissions/constants";
import type { RoleRow } from "@/features/organizations/actions";

function formatLabel(key: string) {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatActions(actions: string[]) {
  if (actions.includes("*")) return "All actions";
  return actions.map(formatLabel).join(", ");
}

/** Modules the role can access, in canonical MODULES order. */
function roleModules(permissions: Record<string, string[]>) {
  if (permissions["*"]) return null; // full access
  return MODULES.filter((m) => (permissions[m]?.length ?? 0) > 0);
}

export function RolesReference({ roles }: { roles: RoleRow[] }) {
  return (
    <div className="space-y-4">
      {roles.map((role) => {
        const modules = roleModules(role.permissions);
        const fullAccess = modules === null;

        return (
          <Card key={role.roleId}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {role.roleName}
                {role.isSystem && (
                  <Badge variant="secondary">System role</Badge>
                )}
                {fullAccess && <Badge>Full access</Badge>}
              </CardTitle>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {fullAccess ? (
                <p className="text-muted-foreground text-sm">
                  This role has unrestricted access to every module and action.
                </p>
              ) : (
                <>
                  <div
                    className="flex flex-wrap gap-1.5"
                    aria-label={`Modules accessible to ${role.roleName}`}
                  >
                    {modules.map((m) => (
                      <Badge key={m} variant="outline">
                        {formatLabel(m)}
                      </Badge>
                    ))}
                  </div>

                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <caption className="sr-only">
                        Permission matrix for {role.roleName}
                      </caption>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col" className="w-48">
                            Module
                          </TableHead>
                          <TableHead scope="col">Allowed actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modules.map((m) => (
                          <TableRow key={m}>
                            <TableCell className="font-medium">
                              {formatLabel(m)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatActions(role.permissions[m] ?? [])}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
