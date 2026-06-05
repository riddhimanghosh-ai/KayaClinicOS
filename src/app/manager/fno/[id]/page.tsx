'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { Package, CheckCircle2, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

type BomItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  mandatory: boolean;
  estimated_qty: number;
  actual_qty: number;
};

const LASER_BOM: BomItem[] = [
  { id: 'l1', name: 'Disposable gloves', category: 'PPE', unit: 'pair', mandatory: true, estimated_qty: 2, actual_qty: 2 },
  { id: 'l2', name: 'Laser protective goggles', category: 'Safety', unit: 'pcs', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 'l3', name: 'Cooling gel', category: 'Consumable', unit: 'ml', mandatory: false, estimated_qty: 30, actual_qty: 30 },
  { id: 'l4', name: 'Gauze pads', category: 'Consumable', unit: 'pcs', mandatory: false, estimated_qty: 4, actual_qty: 4 },
  { id: 'l5', name: 'Alcohol wipes', category: 'Consumable', unit: 'pcs', mandatory: true, estimated_qty: 3, actual_qty: 3 },
  { id: 'l6', name: 'Post-laser soothing cream', category: 'Topical', unit: 'g', mandatory: false, estimated_qty: 2, actual_qty: 2 },
  { id: 'l7', name: 'Carbon lotion', category: 'Topical', unit: 'ml', mandatory: false, estimated_qty: 5, actual_qty: 0 },
];
const PEEL_BOM: BomItem[] = [
  { id: 'p1', name: 'Disposable gloves', category: 'PPE', unit: 'pair', mandatory: true, estimated_qty: 2, actual_qty: 2 },
  { id: 'p2', name: 'Acid solution', category: 'Chemical', unit: 'ml', mandatory: true, estimated_qty: 3, actual_qty: 3 },
  { id: 'p3', name: 'Neutraliser', category: 'Chemical', unit: 'ml', mandatory: true, estimated_qty: 5, actual_qty: 5 },
  { id: 'p4', name: 'Gauze pads', category: 'Consumable', unit: 'pcs', mandatory: false, estimated_qty: 6, actual_qty: 6 },
  { id: 'p5', name: 'Post-peel barrier cream', category: 'Topical', unit: 'g', mandatory: false, estimated_qty: 3, actual_qty: 3 },
  { id: 'p6', name: 'Alcohol wipes', category: 'Consumable', unit: 'pcs', mandatory: true, estimated_qty: 2, actual_qty: 2 },
];
const FACIAL_BOM: BomItem[] = [
  { id: 'f1', name: 'Disposable gloves', category: 'PPE', unit: 'pair', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 'f2', name: 'Cleansing solution', category: 'Consumable', unit: 'ml', mandatory: true, estimated_qty: 10, actual_qty: 10 },
  { id: 'f3', name: 'Exfoliant', category: 'Consumable', unit: 'ml', mandatory: false, estimated_qty: 5, actual_qty: 5 },
  { id: 'f4', name: 'Serum cartridge', category: 'Cartridge', unit: 'pcs', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 'f5', name: 'Sheet mask', category: 'Consumable', unit: 'pcs', mandatory: false, estimated_qty: 1, actual_qty: 0 },
  { id: 'f6', name: 'Moisturiser', category: 'Topical', unit: 'g', mandatory: false, estimated_qty: 2, actual_qty: 2 },
];
const ACNE_BOM: BomItem[] = [
  { id: 'a1', name: 'Disposable gloves', category: 'PPE', unit: 'pair', mandatory: true, estimated_qty: 2, actual_qty: 2 },
  { id: 'a2', name: 'LED mask session', category: 'Equipment', unit: 'session', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 'a3', name: 'Extraction tool covers', category: 'Consumable', unit: 'pcs', mandatory: true, estimated_qty: 2, actual_qty: 2 },
  { id: 'a4', name: 'Anti-acne topical', category: 'Topical', unit: 'ml', mandatory: false, estimated_qty: 2, actual_qty: 2 },
  { id: 'a5', name: 'Gauze pads', category: 'Consumable', unit: 'pcs', mandatory: false, estimated_qty: 4, actual_qty: 4 },
];
const SCAR_BOM: BomItem[] = [
  { id: 's1', name: 'Disposable gloves', category: 'PPE', unit: 'pair', mandatory: true, estimated_qty: 2, actual_qty: 2 },
  { id: 's2', name: 'Microneedling cartridge', category: 'Cartridge', unit: 'pcs', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 's3', name: 'Numbing cream', category: 'Topical', unit: 'g', mandatory: false, estimated_qty: 5, actual_qty: 5 },
  { id: 's4', name: 'Growth factor serum', category: 'Topical', unit: 'ml', mandatory: false, estimated_qty: 3, actual_qty: 3 },
  { id: 's5', name: 'Gauze pads', category: 'Consumable', unit: 'pcs', mandatory: true, estimated_qty: 6, actual_qty: 6 },
  { id: 's6', name: 'Alcohol wipes', category: 'Consumable', unit: 'pcs', mandatory: true, estimated_qty: 3, actual_qty: 3 },
];
const INJ_BOM: BomItem[] = [
  { id: 'i1', name: 'Disposable gloves', category: 'PPE', unit: 'pair', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 'i2', name: 'Syringes 1ml', category: 'Medical', unit: 'pcs', mandatory: true, estimated_qty: 3, actual_qty: 3 },
  { id: 'i3', name: 'Needles 30G', category: 'Medical', unit: 'pcs', mandatory: true, estimated_qty: 5, actual_qty: 5 },
  { id: 'i4', name: 'Alcohol swabs', category: 'Consumable', unit: 'pcs', mandatory: true, estimated_qty: 6, actual_qty: 6 },
  { id: 'i5', name: 'Ice pack', category: 'Consumable', unit: 'pcs', mandatory: false, estimated_qty: 1, actual_qty: 0 },
];
const RF_BOM: BomItem[] = [
  { id: 'r1', name: 'Disposable gloves', category: 'PPE', unit: 'pair', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 'r2', name: 'Conductive gel', category: 'Consumable', unit: 'ml', mandatory: true, estimated_qty: 20, actual_qty: 20 },
  { id: 'r3', name: 'Coupling disk', category: 'Consumable', unit: 'pcs', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 'r4', name: 'Soothing serum', category: 'Topical', unit: 'ml', mandatory: false, estimated_qty: 3, actual_qty: 3 },
];
const DEFAULT_BOM: BomItem[] = [
  { id: 'd1', name: 'Disposable gloves', category: 'PPE', unit: 'pair', mandatory: true, estimated_qty: 1, actual_qty: 1 },
  { id: 'd2', name: 'Gauze pads', category: 'Consumable', unit: 'pcs', mandatory: false, estimated_qty: 4, actual_qty: 4 },
  { id: 'd3', name: 'Alcohol wipes', category: 'Consumable', unit: 'pcs', mandatory: true, estimated_qty: 2, actual_qty: 2 },
];

function getBom(serviceType: string): BomItem[] {
  const s = serviceType.toLowerCase();
  if (s.includes('laser') || s.includes('carbon')) return LASER_BOM.map(i => ({ ...i }));
  if (s.includes('peel')) return PEEL_BOM.map(i => ({ ...i }));
  if (s.includes('facial') || s.includes('hydra')) return FACIAL_BOM.map(i => ({ ...i }));
  if (s.includes('acne')) return ACNE_BOM.map(i => ({ ...i }));
  if (s.includes('scar') || s.includes('microneedling') || s.includes('dermafrac') || s.includes('subcision')) return SCAR_BOM.map(i => ({ ...i }));
  if (s.includes('botox') || s.includes('filler')) return INJ_BOM.map(i => ({ ...i }));
  if (s.includes('thermage') || s.includes('gentle touch')) return RF_BOM.map(i => ({ ...i }));
  return DEFAULT_BOM.map(i => ({ ...i }));
}

export default function FnoPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = Number(params.id);

  const [appt, setAppt] = useState<any>(null);
  const [bom, setBom] = useState<BomItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const todayStr = new Intl.DateTimeFormat('sv-SE').format(new Date());
    fetch('/api/appointments?date=' + todayStr)
      .then(r => r.json())
      .then(d => {
        const found = (d.rows ?? []).find((a: any) => a.id === appointmentId);
        setAppt(found ?? null);
        if (found) setBom(getBom(found.service_type));
        setLoading(false);
      });
  }, [appointmentId]);

  const updateQty = (id: string, qty: number) => {
    setBom(prev => prev.map(item => item.id === id ? { ...item, actual_qty: Math.max(0, qty) } : item));
  };

  const submit = async () => {
    setSaving(true);
    await fetch('/api/manager/fno/' + appointmentId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: appt?.patient_id, service_type: appt?.service_type, bom_items: bom }),
    });
    setSubmitted(true);
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (submitted) return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="FnO — Inventory" subtitle="Material consumption recorded" />
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <div className="text-lg font-semibold">Inventory updated</div>
          <p className="text-sm text-muted-foreground">Material consumption recorded and stock levels updated.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.push('/manager/today')}>Back to Daily Ops</Button>
            <Button onClick={() => router.push('/manager/appointments')}>Schedule Board</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="FnO — Material Consumption"
        subtitle={appt ? appt.patient_name + ' · ' + appt.service_type : 'Session #' + appointmentId}
        actions={
          <a href="/manager/appointments" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Schedule
          </a>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Bill of Materials
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Mandatory items auto-filled. Update actual quantities for optional items as needed.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_72px_72px_90px] gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b">
              <span>Item</span><span className="text-center">Est.</span><span className="text-center">Actual</span><span className="text-center">Type</span>
            </div>
            {bom.map(item => (
              <div key={item.id} className={'grid grid-cols-[1fr_72px_72px_90px] gap-2 items-center px-3 py-2.5 rounded-lg ' + (item.mandatory ? 'bg-secondary/30' : '')}>
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-[10px] text-muted-foreground">{item.category} · {item.unit}</div>
                </div>
                <div className="text-center text-sm text-muted-foreground">{item.estimated_qty}</div>
                <div className="flex justify-center">
                  {item.mandatory ? (
                    <span className="text-sm font-semibold">{item.actual_qty}</span>
                  ) : (
                    <input type="number" min="0" value={item.actual_qty}
                      onChange={e => updateQty(item.id, Number(e.target.value))}
                      className="w-14 rounded border border-border bg-background text-center text-sm px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
                  )}
                </div>
                <div className="flex justify-center">
                  <Badge variant={item.mandatory ? 'accent' : 'outline'} className="text-[9px]">
                    {item.mandatory ? 'Auto' : 'Manual'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">Once submitted, quantities will be deducted from clinic inventory. This cannot be undone.</p>
      </div>

      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
        Submit &amp; Update Inventory
      </Button>
    </div>
  );
}
