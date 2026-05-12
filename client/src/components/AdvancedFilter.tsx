import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Filter, Search } from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

interface AdvancedFilterProps {
  onSearch: (term: string) => void;
  onFilter: (filters: Record<string, string[]>) => void;
  onReset: () => void;
  filterOptions: FilterOption[];
  placeholder?: string;
}

export function AdvancedFilter({
  onSearch,
  onFilter,
  onReset,
  filterOptions,
  placeholder = "Buscar...",
}: AdvancedFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const toggleFilter = (filterGroup: string, value: string) => {
    setSelectedFilters((prev) => {
      const current = prev[filterGroup] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      const newFilters = updated.length > 0
        ? { ...prev, [filterGroup]: updated }
        : { ...prev, [filterGroup]: [] };

      onFilter(newFilters);
      return newFilters;
    });
  };

  const handleReset = () => {
    setSearchTerm("");
    setSelectedFilters({});
    setIsOpen(false);
    onReset();
  };

  const activeFiltersCount = Object.values(selectedFilters).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-2.5" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch("")}
                className="p-2 hover:bg-accent rounded transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex gap-2">
            <Button
              variant={isOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="bg-primary-foreground text-primary px-2 rounded-full text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filter Options */}
          {isOpen && (
            <div className="space-y-4 pt-4 border-t">
              {filterOptions.map((filterGroup) => (
                <div key={filterGroup.id}>
                  <label className="text-sm font-semibold block mb-2">
                    {filterGroup.label}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filterGroup.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleFilter(filterGroup.id, option.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          selectedFilters[filterGroup.id]?.includes(option.value)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * EXEMPLO DE USO:
 * 
 * import { AdvancedFilter } from "@/components/AdvancedFilter";
 * 
 * const filterOptions = [
 *   {
 *     id: "status",
 *     label: "Status",
 *     options: [
 *       { value: "ativo", label: "Ativo" },
 *       { value: "inativo", label: "Inativo" },
 *     ],
 *   },
 *   {
 *     id: "type",
 *     label: "Tipo",
 *     options: [
 *       { value: "produtor", label: "Produtor" },
 *       { value: "integrado", label: "Integrado" },
 *       { value: "distribuidor", label: "Distribuidor" },
 *     ],
 *   },
 * ];
 * 
 * export default function MyPage() {
 *   const [data, setData] = useState(initialData);
 *   const [filtered, setFiltered] = useState(initialData);
 * 
 *   const handleSearch = (term: string) => {
 *     const results = data.filter((item) =>
 *       item.name.toLowerCase().includes(term.toLowerCase())
 *     );
 *     setFiltered(results);
 *   };
 * 
 *   const handleFilter = (filters: Record<string, string[]>) => {
 *     let results = data;
 * 
 *     if (filters.status?.length > 0) {
 *       results = results.filter((item) => filters.status.includes(item.status));
 *     }
 * 
 *     if (filters.type?.length > 0) {
 *       results = results.filter((item) => filters.type.includes(item.type));
 *     }
 * 
 *     setFiltered(results);
 *   };
 * 
 *   const handleReset = () => {
 *     setFiltered(data);
 *   };
 * 
 *   return (
 *     <>
 *       <AdvancedFilter
 *         onSearch={handleSearch}
 *         onFilter={handleFilter}
 *         onReset={handleReset}
 *         filterOptions={filterOptions}
 *         placeholder="Buscar por nome..."
 *       />
 *       {/* Seu conteúdo aqui */}
 *     </>
 *   );
 * }
 */
