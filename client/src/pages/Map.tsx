import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Map, MapPin, Users, Building2, Search } from "lucide-react";

// Mock data - coordenadas aproximadas de cidades SP
const mockClientsByRegion = [
  {
    region: "Ribeirão Preto",
    state: "SP",
    lat: -21.1789,
    lng: -47.8101,
    clients: 234,
    revenue: 2300000,
    representatives: ["João Silva"],
    clientsList: [
      { name: "Fazenda São João", type: "Produtor" },
      { name: "Granja Santa Rita", type: "Integrado" },
      { name: "Pecuária União", type: "Produtor" },
    ],
  },
  {
    region: "Araraquara",
    state: "SP",
    lat: -21.7942,
    lng: -48.1751,
    clients: 189,
    revenue: 1800000,
    representatives: ["Maria Santos"],
    clientsList: [
      { name: "Granja Boa Vista", type: "Integrado" },
      { name: "Fazenda Esperança", type: "Produtor" },
    ],
  },
  {
    region: "Jaboticabal",
    state: "SP",
    lat: -21.2541,
    lng: -48.3056,
    clients: 156,
    revenue: 1500000,
    representatives: ["Carlos Oliveira"],
    clientsList: [
      { name: "Pecuária Santa Maria", type: "Produtor" },
      { name: "Fazenda Nova Era", type: "Produtor" },
    ],
  },
  {
    region: "Sertãozinho",
    state: "SP",
    lat: -21.1369,
    lng: -48.0744,
    clients: 128,
    revenue: 1200000,
    representatives: ["Ana Silva"],
    clientsList: [
      { name: "Granja Vista Verde", type: "Integrado" },
    ],
  },
  {
    region: "Duartina",
    state: "SP",
    lat: -21.5328,
    lng: -49.0694,
    clients: 98,
    revenue: 950000,
    representatives: ["Pedro Costa"],
    clientsList: [
      { name: "Fazenda Bom Pastor", type: "Produtor" },
    ],
  },
];

interface Region {
  region: string;
  state: string;
  lat: number;
  lng: number;
  clients: number;
  revenue: number;
  representatives: string[];
  clientsList: Array<{ name: string; type: string }>;
}

export default function MapPage() {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(mockClientsByRegion[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapView, setMapView] = useState<"list" | "grid">("grid");

  const filteredRegions = mockClientsByRegion.filter(
    (r) =>
      r.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clientsList.some((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalClients = mockClientsByRegion.reduce((sum, r) => sum + r.clients, 0);
  const totalRevenue = mockClientsByRegion.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Map className="h-8 w-8" />
          Mapa de Clientes
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize distribuição de clientes por região
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total de Clientes</p>
              <p className="text-3xl font-bold mt-2">{totalClients}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Regiões Atendidas</p>
              <p className="text-3xl font-bold mt-2">{mockClientsByRegion.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Faturamento Total</p>
              <p className="text-3xl font-bold mt-2">
                R$ {(totalRevenue / 1000000).toFixed(1)}M
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapa Simulado (SVG) */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>São Paulo - Distribuição Regional</CardTitle>
          <CardDescription>Clique em uma região para mais detalhes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-blue-50 to-green-50 p-8 rounded-lg">
            <svg viewBox="-50 -50 500 500" className="w-full h-96 max-w-2xl mx-auto">
              {/* Mapa simplificado SP */}
              <rect x="0" y="0" width="400" height="400" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />

              {/* Pontos de cada região */}
              {mockClientsByRegion.map((region, idx) => {
                const x = (region.lng + 48) * 50;
                const y = (region.lat + 23) * 50;
                const isSelected = selectedRegion?.region === region.region;

                return (
                  <g
                    key={idx}
                    onClick={() => setSelectedRegion(region)}
                    className="cursor-pointer"
                  >
                    {/* Círculo base */}
                    <circle
                      cx={x}
                      cy={y}
                      r={region.clients / 50}
                      fill={isSelected ? "#ef4444" : "#10b981"}
                      opacity="0.7"
                      className="hover:opacity-100 transition"
                    />

                    {/* Círculo selecionado */}
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r={region.clients / 50 + 15}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    )}

                    {/* Label */}
                    <text
                      x={x}
                      y={y + 40}
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="#1f2937"
                    >
                      {region.region}
                    </text>
                    <text
                      x={x}
                      y={y + 52}
                      fontSize="10"
                      textAnchor="middle"
                      fill="#6b7280"
                    >
                      {region.clients} clientes
                    </text>
                  </g>
                );
              })}
            </svg>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Tamanho do círculo = quantidade de clientes | Vermelho = selecionado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filtro e View Toggle */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-2">Buscar região ou cliente</label>
          <div className="flex gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Ribeirão Preto, Araraquara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mapView === "grid" ? "default" : "outline"}
            onClick={() => setMapView("grid")}
          >
            Grade
          </Button>
          <Button
            variant={mapView === "list" ? "default" : "outline"}
            onClick={() => setMapView("list")}
          >
            Lista
          </Button>
        </div>
      </div>

      {/* Regiões Grid/List */}
      {mapView === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRegions.map((region) => (
            <Card
              key={region.region}
              className={`cursor-pointer transition ${
                selectedRegion?.region === region.region
                  ? "border-2 border-primary shadow-lg"
                  : "hover:shadow-md"
              }`}
              onClick={() => setSelectedRegion(region)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {region.region}/{region.state}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="text-xl font-bold">{region.clients}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="text-lg font-bold">
                      R$ {(region.revenue / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Representantes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {region.representatives.map((rep) => (
                      <Badge key={rep} variant="secondary" className="text-xs">
                        {rep}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {filteredRegions.map((region) => (
                <div
                  key={region.region}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedRegion?.region === region.region
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedRegion(region)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">
                          {region.region}/{region.state}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {region.clientsList.length} maiores clientes
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{region.clients} clientes</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {(region.revenue / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalhe da Região Selecionada */}
      {selectedRegion && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalhes - {selectedRegion.region}/{selectedRegion.state}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {selectedRegion.clients}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold">
                  R$ {(selectedRegion.revenue / 1000000).toFixed(1)}M
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  R$ {(selectedRegion.revenue / selectedRegion.clients / 1000).toFixed(0)}K
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Representantes</p>
                <p className="text-2xl font-bold">{selectedRegion.representatives.length}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Principais Clientes
              </h4>
              <div className="space-y-2">
                {selectedRegion.clientsList.map((client, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded border border-border/50"
                  >
                    <p className="font-medium text-sm">{client.name}</p>
                    <Badge variant="outline">{client.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
