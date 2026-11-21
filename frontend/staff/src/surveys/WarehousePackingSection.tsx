import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
  QrCode,
  Truck,
  ShieldCheck,
  PackageCheck,
  Calendar,
} from 'lucide-react';
import {
  fetchPackingOrder,
  updatePackingItem,
  dispatchPackingOrder,
  deliverPackingOrder,
  fetchWarranties,
  PACKING_ORDER_KEY,
  WARRANTIES_KEY,
} from '../api/quotes';
import { Icon } from '../components/Icon';
import type { Installation } from '../api/surveys';

export function WarehousePackingSection({ installation }: { installation: Installation }) {
  const qc = useQueryClient();

  const packingQuery = useQuery({
    queryKey: PACKING_ORDER_KEY(installation.id),
    queryFn: ({ signal }) => fetchPackingOrder(installation.id, signal),
  });

  const warrantiesQuery = useQuery({
    queryKey: WARRANTIES_KEY(installation.id),
    queryFn: ({ signal }) => fetchWarranties(installation.id, signal),
  });

  const [editingSerial, setEditingSerial] = useState<{ [itemId: number]: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateItem = useMutation({
    mutationFn: ({ itemId, isPacked, serial }: { itemId: number; isPacked: boolean; serial?: string | null }) =>
      updatePackingItem(packingQuery.data!.id, itemId, isPacked, serial),
    onSuccess: (data) => {
      setErrorMessage(null);
      qc.setQueryData(PACKING_ORDER_KEY(installation.id), data);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to update packing item.');
    },
  });

  const dispatchOrder = useMutation({
    mutationFn: (orderId: number) => dispatchPackingOrder(orderId),
    onSuccess: (data) => {
      setErrorMessage(null);
      qc.setQueryData(PACKING_ORDER_KEY(installation.id), data);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to dispatch order. Check packing and serial requirements.');
    },
  });

  const deliverOrder = useMutation({
    mutationFn: (orderId: number) => deliverPackingOrder(orderId),
    onSuccess: (data) => {
      setErrorMessage(null);
      qc.setQueryData(PACKING_ORDER_KEY(installation.id), data);
      qc.invalidateQueries({ queryKey: WARRANTIES_KEY(installation.id) });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to record delivery.');
    },
  });

  if (packingQuery.isLoading) {
    return (
      <div style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
        <Icon icon={LoaderCircle} className="spin" />
        <span>Loading warehouse packing order...</span>
      </div>
    );
  }

  const order = packingQuery.data;
  if (!order) return null;

  const totalCount = order.items.length;
  const packedCount = order.items.filter((i) => i.isPacked).length;
  const serialRequiredItems = order.items.filter((i) => i.requiresSerialNumber);
  const serialScannedCount = serialRequiredItems.filter((i) => !!i.serialNumber?.trim()).length;
  const allPacked = packedCount === totalCount;
  const allSerialsScanned = serialScannedCount === serialRequiredItems.length;
  const canDispatch = allPacked && allSerialsScanned;

  const statusBg =
    order.status === 'Delivered'
      ? '#dcfce7'
      : order.status === 'Dispatched'
      ? '#e0e7ff'
      : order.status === 'Packed'
      ? '#fef3c7'
      : '#f3f4f6';

  const statusColor =
    order.status === 'Delivered'
      ? '#166534'
      : order.status === 'Dispatched'
      ? '#3730a3'
      : order.status === 'Packed'
      ? '#92400e'
      : '#4b5563';

  return (
    <section style={{ marginTop: '2.5rem' }}>
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="a-heading">Warehouse Packing & Dispatch</h2>
          <span className="a-label">
            Packing #{order.id} &bull; {packedCount}/{totalCount} packed &bull; {serialScannedCount}/{serialRequiredItems.length} serials scanned
          </span>
        </div>
        <span
          style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: statusBg,
            color: statusColor,
          }}
        >
          {order.status}
        </span>
      </div>

      <div className="rec-card" style={{ padding: '1.5rem' }}>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Order confirmed & advance paid. Pack hardware items below. High-value inverters, batteries, and controllers require unique serial numbers before truck dispatch (Scene 3).
        </p>

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Icon icon={AlertTriangle} size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--faint)' }}>
                <th style={{ padding: '0.6rem 0.5rem', width: '2.5rem' }}>Packed</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Item</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Category</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Quantity</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Serial Number / Barcode</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const serialValue = editingSerial[item.id] ?? item.serialNumber ?? '';
                const isMissingSerial = item.requiresSerialNumber && !item.serialNumber;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--line-subtle, rgba(0,0,0,0.05))' }}>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={item.isPacked}
                        disabled={updateItem.isPending || order.status === 'Dispatched' || order.status === 'Delivered'}
                        onChange={(e) => {
                          updateItem.mutate({
                            itemId: item.id,
                            isPacked: e.target.checked,
                            serial: serialValue || item.serialNumber,
                          });
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{item.itemName}</span>
                        {item.requiresSerialNumber && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: item.serialNumber ? '#dcfce7' : '#fee2e2',
                              color: item.serialNumber ? '#166534' : '#991b1b',
                              fontWeight: 700,
                            }}
                          >
                            {item.serialNumber ? 'Scanned' : 'Serial Required'}
                          </span>
                        )}
                        {item.category === 'SolarPanels' && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: '#fef3c7',
                              color: '#92400e',
                              fontWeight: 600,
                            }}
                          >
                            20-Yr Warranty
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--muted)' }}>{item.category}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      {item.requiresSerialNumber || item.category === 'SolarPanels' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder={item.category === 'SolarPanels' ? 'Batch / Module S/N...' : 'Scan or enter S/N...'}
                            value={serialValue}
                            disabled={order.status === 'Dispatched' || order.status === 'Delivered'}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.85rem',
                              border: isMissingSerial ? '1.5px solid #ef4444' : '1px solid var(--line)',
                              borderRadius: 'var(--radius-sm)',
                              width: '13rem',
                              background: isMissingSerial ? '#fff5f5' : 'transparent',
                            }}
                            onChange={(e) => setEditingSerial((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            onBlur={() => {
                              if (serialValue !== item.serialNumber) {
                                updateItem.mutate({
                                  itemId: item.id,
                                  isPacked: item.isPacked,
                                  serial: serialValue,
                                });
                              }
                            }}
                          />
                          <Icon icon={QrCode} size={16} color="var(--muted)" />
                        </div>
                      ) : (
                        <span style={{ color: 'var(--faint)', fontSize: '0.8rem' }}>Standard stock</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action Banners & Gates */}
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {order.status === 'Pending' && !canDispatch && (
            <div
              style={{
                padding: '0.85rem 1rem',
                background: 'var(--bg-subtle, #f9fafb)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.85rem',
                color: 'var(--muted)',
              }}
            >
              <Icon icon={AlertTriangle} size={18} color="#d97706" />
              <div>
                <b>Dispatch Gate Active:</b> Complete packing ({packedCount}/{totalCount}) and scan serial numbers for all high-value electronics ({serialScannedCount}/{serialRequiredItems.length}) before releasing the truck.
              </div>
            </div>
          )}

          {order.status === 'Packed' && (
            <div
              style={{
                padding: '1rem',
                background: 'color-mix(in srgb, #16a34a 10%, transparent)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 color="#16a34a" size={20} />
                <div>
                  <b>All hardware packed & serialized:</b> The ₹1,50,000 kit is verified for truck dispatch.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canDispatch || dispatchOrder.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                onClick={() => dispatchOrder.mutate(order.id)}
              >
                {dispatchOrder.isPending ? <Icon icon={LoaderCircle} className="spin" size={16} /> : <Icon icon={Truck} size={16} />}
                <span>Dispatch Truck</span>
              </button>
            </div>
          )}

          {order.status === 'Dispatched' && (
            <div
              style={{
                padding: '1rem',
                background: 'color-mix(in srgb, #3b82f6 10%, transparent)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Truck color="#2563eb" size={20} />
                <div>
                  <b>Truck En Route to Customer Site:</b> Dispatched at{' '}
                  {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={deliverOrder.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                onClick={() => deliverOrder.mutate(order.id)}
              >
                {deliverOrder.isPending ? <Icon icon={LoaderCircle} className="spin" size={16} /> : <Icon icon={PackageCheck} size={16} />}
                <span>Confirm Site Delivery</span>
              </button>
            </div>
          )}

          {order.status === 'Delivered' && (
            <div
              style={{
                padding: '1rem',
                background: 'color-mix(in srgb, #16a34a 10%, transparent)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9rem',
              }}
            >
              <CheckCircle2 color="#16a34a" size={20} />
              <div>
                <b>Delivered &amp; Handed Over:</b> Delivery recorded at{' '}
                {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'recently'}. Hardware warranties have been auto-registered.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Equipment Warranties (Scene 3 & 5) */}
      {warrantiesQuery.data && warrantiesQuery.data.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon icon={ShieldCheck} size={20} color="#16a34a" />
              <h3 className="a-heading" style={{ fontSize: '1.1rem', margin: 0 }}>Active Equipment Warranties</h3>
            </div>
            <span className="a-label" style={{ fontSize: '0.8rem' }}>Automated Warranty Clocks</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {warrantiesQuery.data.map((w) => (
              <div
                key={w.id}
                className="rec-card"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  borderLeft: w.isCovered ? '4px solid #16a34a' : '4px solid #dc2626',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.itemName}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                      background: w.isCovered ? '#dcfce7' : '#fee2e2',
                      color: w.isCovered ? '#166534' : '#991b1b',
                      fontWeight: 700,
                    }}
                  >
                    {w.isCovered ? `${w.remainingDays} days left` : 'Expired'}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  <span>S/N: </span>
                  <code style={{ fontWeight: 700, color: 'var(--fg)' }}>{w.serialNumber}</code>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <Icon icon={Calendar} size={14} />
                  <span>
                    {w.warrantyYears}-Year Coverage &bull; Valid until {new Date(w.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
