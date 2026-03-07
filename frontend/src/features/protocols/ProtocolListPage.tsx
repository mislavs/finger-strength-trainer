import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteProtocolDialog } from "@/features/protocols/DeleteProtocolDialog";
import { useProtocols } from "@/features/protocols/hooks";
import type { ProtocolSummary } from "@/features/protocols/models";
import { appRoutes } from "@/lib/app-routes";

function ProtocolListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ProtocolListPage() {
  const protocolsQuery = useProtocols();
  const [protocolToDelete, setProtocolToDelete] = useState<ProtocolSummary | null>(null);

  const openDeleteDialog = (protocol: ProtocolSummary) => setProtocolToDelete(protocol);
  const closeDeleteDialog = () => setProtocolToDelete(null);
  const handleDeleteDialogChange = (open: boolean) => {
    if (!open) {
      closeDeleteDialog();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Protocols</h1>
        <Button asChild>
          <Link to={appRoutes.protocolsNew}>
            <Plus className="size-4" />
            New Protocol
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved protocols</CardTitle>
        </CardHeader>
        <CardContent>
          {protocolsQuery.isLoading ? (
            <ProtocolListSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Weight %</TableHead>
                  <TableHead>Reps / Set</TableHead>
                  <TableHead>Sets</TableHead>
                  <TableHead>Work (s)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocolsQuery.data?.length ? (
                  protocolsQuery.data.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{protocol.name}</span>
                          {protocol.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>{protocol.weightPercentage}</TableCell>
                      <TableCell>{protocol.repsPerSet}</TableCell>
                      <TableCell>{protocol.numberOfSets}</TableCell>
                      <TableCell>{protocol.workSeconds}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`${appRoutes.protocols}/${protocol.id}/edit`}>
                              <Pencil className="size-4" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={protocol.isDefault}
                            onClick={() => openDeleteDialog(protocol)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No protocols found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {protocolsQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">Failed to load protocols. Please try again.</p>
          ) : null}
        </CardContent>
      </Card>

      <DeleteProtocolDialog protocol={protocolToDelete} open={Boolean(protocolToDelete)} onOpenChange={handleDeleteDialogChange} />
    </div>
  );
}
