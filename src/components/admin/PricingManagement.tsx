import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Upload,
  MoreVertical,
  Search,
  Download,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Plus,
  DollarSign,
  Euro,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchPriceLists,
  createPriceList,
  updatePriceList,
  deletePriceList,
  uploadPriceListFile,
  deletePriceListFile,
  type PriceList,
} from '../../lib/api/price-lists';
import { saveContentSharing, getContentDistributors } from '../../lib/api/sharing';
import DistributorSelector, { filterDistributorIds } from './DistributorSelector';

const EMPTY_FORM = {
  name: '',
  currency: 'EUR' as 'EUR' | 'USD',
  description: '',
  status: 'draft' as 'draft' | 'published' | 'archived',
  valid_from: '',
  valid_until: '',
};

export default function PricingManagement() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDistributorIds, setSelectedDistributorIds] = useState<string[]>([]);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    const { data, error } = await fetchPriceLists();
    if (error) toast.error('Failed to load price lists');
    else setPriceLists(data || []);
    setIsLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSelectedFile(null);
    setSelectedDistributorIds([]);
    setDialogOpen(true);
  };

  const openEdit = async (pl: PriceList) => {
    setEditingId(pl.id);
    setForm({
      name: pl.name,
      currency: pl.currency,
      description: pl.description || '',
      status: pl.status,
      valid_from: pl.valid_from || '',
      valid_until: pl.valid_until || '',
    });
    setSelectedFile(null);
    const distributors = await getContentDistributors('price_lists', pl.id);
    setSelectedDistributorIds(distributors.length === 0 ? [] : distributors);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.currency) {
      toast.error('Name and currency are required');
      return;
    }

    setIsSaving(true);
    try {
      let file_url: string | undefined;
      let file_path: string | undefined;
      let file_size: number | undefined;

      if (selectedFile) {
        const uploaded = await uploadPriceListFile(selectedFile);
        file_url = uploaded.url;
        file_path = uploaded.path;
        file_size = selectedFile.size;
      }

      const payload: any = {
        name: form.name,
        currency: form.currency,
        description: form.description || undefined,
        status: form.status,
        valid_from: form.valid_from || undefined,
        valid_until: form.valid_until || undefined,
      };
      if (file_url) { payload.file_url = file_url; payload.file_path = file_path; payload.file_size = file_size; }

      let id = editingId;

      if (editingId) {
        const { error } = await updatePriceList(editingId, payload);
        if (error) throw error;
        toast.success('Price list updated');
      } else {
        const { data, error } = await createPriceList(payload);
        if (error) throw error;
        id = data!.id;
        toast.success('Price list created');
      }

      // Save sharing
      await saveContentSharing('price_lists', id!, filterDistributorIds(selectedDistributorIds));

      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const pl = priceLists.find(p => p.id === deleteId);
      if (pl?.file_path) await deletePriceListFile(pl.file_path);
      const { error } = await deletePriceList(deleteId);
      if (error) throw error;
      toast.success('Price list deleted');
      setPriceLists(prev => prev.filter(p => p.id !== deleteId));
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const filtered = priceLists.filter(pl =>
    pl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currencyBadge = (currency: string) => (
    <Badge
      className={`text-xs font-semibold ${
        currency === 'EUR'
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : 'bg-green-100 text-green-800 border-green-200'
      }`}
      variant="outline"
    >
      {currency === 'EUR' ? <Euro className="h-3 w-3 mr-1" /> : <DollarSign className="h-3 w-3 mr-1" />}
      {currency}
    </Badge>
  );

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-slate-100 text-slate-700',
      archived: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={`text-xs ${styles[status] || ''}`} variant="outline">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-1">Pricing</h1>
        <p className="text-[15px] text-slate-500">
          Manage EUR and USD price lists and control which distributors can access each one.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search price lists..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-slate-200"
          />
        </div>
        <Button onClick={openAdd} className="bg-[#01B8D1] hover:bg-[#00a0bb] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Price List
        </Button>
      </div>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-[#01B8D1]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-3">
              <FileText className="h-12 w-12 text-slate-300" />
              <p className="text-[15px]">No price lists found</p>
              <Button variant="outline" size="sm" onClick={openAdd}>
                Add your first price list
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[13px]">Name</TableHead>
                  <TableHead className="text-[13px]">Currency</TableHead>
                  <TableHead className="text-[13px]">Status</TableHead>
                  <TableHead className="text-[13px]">File</TableHead>
                  <TableHead className="text-[13px]">Valid Until</TableHead>
                  <TableHead className="text-[13px]">Downloads</TableHead>
                  <TableHead className="text-[13px] w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(pl => (
                  <TableRow key={pl.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="font-medium text-slate-900">{pl.name}</div>
                      {pl.description && (
                        <div className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">{pl.description}</div>
                      )}
                    </TableCell>
                    <TableCell>{currencyBadge(pl.currency)}</TableCell>
                    <TableCell>{statusBadge(pl.status)}</TableCell>
                    <TableCell>
                      {pl.file_url ? (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-[12px] text-slate-600">{formatBytes(pl.file_size)}</span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-400">No file</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-slate-600">
                        {pl.valid_until ? new Date(pl.valid_until).toLocaleDateString() : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-[13px] text-slate-600">
                        <Download className="h-3.5 w-3.5" />
                        {pl.downloads}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(pl)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {pl.file_url && (
                            <DropdownMenuItem asChild>
                              <a href={pl.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteId(pl.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Price List' : 'Add Price List'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="pl-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pl-name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. European Price List 2025"
              />
            </div>

            {/* Currency + Status row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Currency <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.currency}
                  onValueChange={v => setForm({ ...form, currency: v as 'EUR' | 'USD' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">
                      <span className="flex items-center gap-2">
                        <Euro className="h-4 w-4" /> EUR — Euro
                      </span>
                    </SelectItem>
                    <SelectItem value="USD">
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> USD — US Dollar
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={v => setForm({ ...form, status: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Validity period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pl-from">Valid From</Label>
                <Input
                  id="pl-from"
                  type="date"
                  value={form.valid_from}
                  onChange={e => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pl-until">Valid Until</Label>
                <Input
                  id="pl-until"
                  type="date"
                  value={form.valid_until}
                  onChange={e => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="pl-desc">Description</Label>
              <Textarea
                id="pl-desc"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Internal notes about this price list..."
                rows={2}
              />
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>Price List File (PDF, Excel, CSV)</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 hover:border-[#01B8D1] transition-colors">
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-8 w-8 text-slate-400" />
                  <Input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="max-w-xs"
                  />
                  {selectedFile && (
                    <p className="text-[13px] text-[#01B8D1] font-medium">{selectedFile.name}</p>
                  )}
                  <p className="text-[12px] text-slate-400">PDF, Excel or CSV</p>
                </div>
              </div>
            </div>

            {/* Distributor access */}
            <div className="space-y-2">
              <DistributorSelector
                selectedDistributorIds={selectedDistributorIds}
                onChange={setSelectedDistributorIds}
                label="Distributor Access"
                description="Choose which distributors can download this price list. Leave blank to share with all."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#01B8D1] hover:bg-[#00a0bb]"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Price List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price List</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the price list and its file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
