'use client';

import React, { useEffect, useState } from 'react';
import { locationsService, Province, Municipality, Neighborhood } from '@/app/services/locations';

interface LocationSelectorProps {
  onLocationChange: (neighborhoodId: number | null) => void;
}

export default function LocationSelector({ onLocationChange }: LocationSelectorProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);

  //Carregar todas as Províncias ao montar o componente
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        // Chamada limpa e direta
        const res = await locationsService.getAllProvinces();
        if (res.success) setProvinces(res.data);
      } catch (err) {
        console.error('Erro ao carregar províncias:', err);
      }
    };
    loadProvinces();
  }, []);

  // Dispara sempre que a Província muda
  const handleProvinceChange = async (provinceId: string) => {
    setSelectedProvince(provinceId);
    setSelectedMunicipality('');
    setSelectedNeighborhood('');
    setMunicipalities([]);
    setNeighborhoods([]);
    onLocationChange(null);

    if (!provinceId) return;

    setLoading(true);
    try {
      // Busca municípios filtrados pela Província de forma transparente
      const res = await locationsService.getMunicipalitiesByProvince(Number(provinceId));
      if (res.success) setMunicipalities(res.data);
    } catch (err) {
      console.error('Erro ao carregar municípios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dispara sempre que o Município muda
  const handleMunicipalityChange = async (municipalityId: string) => {
    setSelectedMunicipality(municipalityId);
    setSelectedNeighborhood('');
    setNeighborhoods([]);
    onLocationChange(null);

    if (!municipalityId) return;

    setLoading(true);
    try {
      // Busca bairros filtrados pelo Município
      const res = await locationsService.getBairrosByMunicipality(Number(municipalityId));
      if (res.success) setNeighborhoods(res.data);
    } catch (err) {
      console.error('Erro ao carregar bairros:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dispara ao selecionar o Bairro final
  const handleNeighborhoodChange = (neighborhoodId: string) => {
    setSelectedNeighborhood(neighborhoodId);
    onLocationChange(neighborhoodId ? Number(neighborhoodId) : null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
      {/* Select Província */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Província</label>
        <select
          value={selectedProvince}
          onChange={(e) => handleProvinceChange(e.target.value)}
          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione a Província...</option>
          {provinces.map((prov) => (
            <option key={prov.id} value={prov.id}>{prov.name}</option>
          ))}
        </select>
      </div>

      {/* Select Município */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Município</label>
        <select
          value={selectedMunicipality}
          disabled={!selectedProvince || loading}
          onChange={(e) => handleMunicipalityChange(e.target.value)}
          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">{loading ? 'A carregar...' : 'Selecione o Município...'}</option>
          {municipalities.map((mun) => (
            <option key={mun.id} value={mun.id}>{mun.name}</option>
          ))}
        </select>
      </div>

      {/* Select Bairro */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bairro / Localidade</label>
        <select
          value={selectedNeighborhood}
          disabled={!selectedMunicipality || loading}
          onChange={(e) => handleNeighborhoodChange(e.target.value)}
          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">{loading ? 'A carregar...' : 'Selecione o Bairro...'}</option>
          {neighborhoods.map((nei) => (
            <option key={nei.id} value={nei.id}>{nei.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}