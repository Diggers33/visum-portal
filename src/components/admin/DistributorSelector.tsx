import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Loader2, Users } from 'lucide-react';
import { fetchDistributors, Distributor } from '@/lib/api/distributors';

interface DistributorSelectorProps {
  selectedDistributorIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  description?: string;
}

export function DistributorSelector({
  selectedDistributorIds,
  onChange,
  label = 'Share with',
  description = 'Select which distributors can access this content',
}: DistributorSelectorProps) {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Empty array = "All Distributors"
  const isAllSelected = selectedDistributorIds.length === 0;

  useEffect(() => {
    loadDistributors();
  }, []);

  const loadDistributors = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchDistributors();
      if (error) {
        console.error('Error loading distributors:', error);
      } else if (data) {
        setDistributors(data);
      }
    } catch (error) {
      console.error('Exception loading distributors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAllChange = (checked: boolean) => {
    if (checked) {
      // Select all (public) = empty array
      onChange([]);
    } else {
      // Uncheck all = select all distributors explicitly
      onChange(distributors.map(d => d.id));
    }
  };

  const handleDistributorToggle = (distributorId: string) => {
    if (isAllSelected) {
      // If "All" was selected, start with just this one
      onChange([distributorId]);
    } else {
      // Toggle individual distributor
      if (selectedDistributorIds.includes(distributorId)) {
        const newIds = selectedDistributorIds.filter((id) => id !== distributorId);
        onChange(newIds);
      } else {
        onChange([...selectedDistributorIds, distributorId]);
      }
    }
  };

  const filteredDistributors = distributors.filter((d) =>
    d.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">{label}</Label>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>

      {/* "All Distributors" checkbox */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-md border border-slate-200">
          <Checkbox
            id="all-distributors"
            checked={isAllSelected}
            onCheckedChange={handleAllChange}
          />
          <div className="flex-1">
            <Label htmlFor="all-distributors" className="font-semibold cursor-pointer flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Distributors (Public)
            </Label>
            <p className="text-xs text-slate-500 mt-1">
              {isAllSelected
                ? 'Uncheck to select specific distributors'
                : 'Check to share with all distributors'}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search distributors..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Distributor list */}
      <ScrollArea className="h-[300px] border rounded-md p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
            <span className="ml-2 text-sm text-slate-500">Loading distributors...</span>
          </div>
        ) : filteredDistributors.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No distributors found</p>
        ) : (
          <div className="space-y-3">
            {filteredDistributors.map((distributor) => (
              <div
                key={distributor.id}
                className="flex items-start space-x-2 p-2 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Checkbox
                  id={`dist-${distributor.id}`}
                  checked={isAllSelected || selectedDistributorIds.includes(distributor.id)}
                  onCheckedChange={() => handleDistributorToggle(distributor.id)}
                />
                <Label
                  htmlFor={`dist-${distributor.id}`}
                  className="cursor-pointer flex-1"
                >
                  <div>
                    <div className="font-medium text-slate-900">{distributor.company_name}</div>
                    <div className="text-sm text-slate-500">
                      {distributor.territory} • {distributor.users?.length || 0} user(s)
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm font-medium text-blue-900">
          {isAllSelected
            ? '✓ Shared with all distributors'
            : `✓ Shared with ${selectedDistributorIds.length} distributor(s)`}
        </p>
      </div>
    </div>
  );
}
