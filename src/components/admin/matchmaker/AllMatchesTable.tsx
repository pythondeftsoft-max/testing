import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, DollarSign, Home, Handshake } from "lucide-react";
import { useAllMatches, MatchRecord } from "@/hooks/useAllMatches";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getMatchStage = (record: MatchRecord) => {
  const today = new Date();
  const moveInDate = record.move_in_date ? new Date(record.move_in_date) : null;
  
  if (moveInDate && moveInDate <= today) return { stage: "Moved In", icon: Home, color: "bg-green-500" };
  if (record.payment_received_date) return { stage: "Payment Received", icon: DollarSign, color: "bg-blue-500" };
  if (record.lease_signed_date) return { stage: "Lease Signed", icon: CheckCircle2, color: "bg-purple-500" };
  return { stage: "Matched", icon: Handshake, color: "bg-yellow-500" };
};

export function AllMatchesTable() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { data: matches, isLoading } = useAllMatches();

  const filteredMatches = matches?.filter((match) => {
    const searchLower = search.toLowerCase();
    return (
      match.tenant_first_name.toLowerCase().includes(searchLower) ||
      match.tenant_last_name.toLowerCase().includes(searchLower) ||
      match.property_address.toLowerCase().includes(searchLower) ||
      match.property_city.toLowerCase().includes(searchLower) ||
      match.unit_number.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalItems = filteredMatches?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMatches = filteredMatches?.slice(startIndex, endIndex) || [];

  // Reset to page 1 when search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const columns: ColumnDef<MatchRecord>[] = [
    {
      accessorKey: "created_at",
      header: "Match Date",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{format(new Date(row.original.created_at), "MMM d, yyyy")}</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "tenant",
      header: "Tenant",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">
            {row.original.tenant_first_name} {row.original.tenant_last_name}
          </div>
          <div className="text-xs text-muted-foreground">{row.original.tenant_email}</div>
          {row.original.tenant_housing_status && (
            <Badge variant="outline" className="text-xs">
              {row.original.tenant_housing_status}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "property",
      header: "Property",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.property_address}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.property_city}, {row.original.property_state}
          </div>
          <div className="text-xs">Unit {row.original.unit_number}</div>
        </div>
      ),
    },
    {
      accessorKey: "monthly_rent",
      header: "Rent",
      cell: ({ row }) => (
        <div className="font-medium">
          ${row.original.monthly_rent?.toLocaleString() || "N/A"}
        </div>
      ),
    },
    {
      accessorKey: "stage",
      header: "Stage",
      cell: ({ row }) => {
        const { stage, icon: Icon, color } = getMatchStage(row.original);
        return (
          <Badge variant="secondary" className="gap-1">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <Icon className="w-3 h-3" />
            {stage}
          </Badge>
        );
      },
    },
    {
      accessorKey: "landlord",
      header: "Landlord",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.landlord_first_name && row.original.landlord_last_name
            ? `${row.original.landlord_first_name} ${row.original.landlord_last_name}`
            : "N/A"}
        </div>
      ),
    },
  ];

  // Cumulative funnel: a moved-in match also counts as having paid and signed.
  const stats = {
    total: matches?.length || 0,
    movedIn: matches?.filter((m) => {
      const today = new Date();
      const moveInDate = m.move_in_date ? new Date(m.move_in_date) : null;
      return moveInDate && moveInDate <= today;
    }).length || 0,
    paymentReceived: matches?.filter((m) => !!m.payment_received_date || !!m.move_in_date).length || 0,
    leaseSigned: matches?.filter((m) => !!m.lease_signed_date || !!m.payment_received_date || !!m.move_in_date).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Matches</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Moved In</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {stats.movedIn}
              <Home className="w-5 h-5 text-green-500" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Payment Received</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {stats.paymentReceived}
              <DollarSign className="w-5 h-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lease Signed</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {stats.leaseSigned}
              <CheckCircle2 className="w-5 h-5 text-purple-500" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Matches</span>
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} matches
              </span>
            )}
          </CardTitle>
          <CardDescription>View all approved matches and their progression</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant, property, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Pagination Controls - Top */}
              {totalItems > 0 && (
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-4">
                    <Select 
                      value={itemsPerPage.toString()} 
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {getPageNumbers().map((pageNum, idx) => (
                        <PaginationItem key={idx}>
                          {pageNum === '...' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum as number)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              <DataTable columns={columns} data={paginatedMatches} />

              {/* Pagination Controls - Bottom */}
              {totalItems > 0 && totalPages > 1 && (
                <div className="flex justify-center pt-4 border-t">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {getPageNumbers().map((pageNum, idx) => (
                        <PaginationItem key={idx}>
                          {pageNum === '...' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum as number)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              {totalItems === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No matches found
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}