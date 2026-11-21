import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LoaderCircle, QrCode } from 'lucide-react';
import { fetchPackingOrder, updatePackingItem, PACKING_ORDER_KEY } from '../api/quotes';
import { Icon } from '../components/Icon';
import type { Installation } from '../api/surveys';

export function WarehousePackingSection({ installation }: { installation: Installation }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: PACKING_ORDER_KEY(installation.id),
    queryFn: ({ signal }) => fetchPackingOrder(installation.id, signal),
  });

  const [editingSerial, setEditingSerial] = useState<{ [itemId: number]: string }>({});

  const updateItem = useMutation({
    mutationFn: ({ itemId, isPacked, serial }: { itemId: number; isPacked: boolean; serial?: string | null }) =>
      updatePackingItem(query.data!.id, itemId, isPacked, serial),
    onSuccess: (data) => {
      qc.setQueryData(PACKING_ORDER_KEY(installation.id), data);
    },
  });

  if (query.isLoading) {
    return (
      <div style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
        <Icon icon={LoaderCircle} className="spin" />
        <span>Loading warehouse packing order...</span>
      </div>
    );
  }

  const order = query.data;
  if (!order) return null;

  const packedCount = order.items.filter(i => i.isPacked).length;
  const totalCount = order.items.length;

  return (
    <section style={{ marginTop: '2.5rem' }}>
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="a-heading">Warehouse Packing Order</h2>
          <span className="a-label">Packing #{order.id} &bull; {packedCount} of {totalCount} items packed</span>
        </div>
        <span style={{
          padding: '0.25rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 600,
          background: order.status === 'Packed' ? '#dcfce7' : '#e0e7ff',
          color: order.status === 'Packed' ? '#166534' : '#3730a3',
        }}>
          {order.status}
        </span>
      </div>

      <div className="rec-card" style={{ padding: '1.5rem' }}>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Order confirmed & advance paid. Pack hardware items below. High-value inverters, batteries and controllers require unique serial numbers before dispatch.
        </p>

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
              {order.items.map(item => {
                const serialValue = editingSerial[item.id] ?? item.serialNumber ?? '';
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--line-subtle, rgba(0,0,0,0.05))' }}>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={item.isPacked}
                        disabled={updateItem.isPending}
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
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontWeight: 700,
                          }}>
                            Serial Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--muted)' }}>{item.category}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{item.quantity} {item.unit}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      {item.requiresSerialNumber ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Scan or enter S/N..."
                            value={serialValue}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.85rem',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-sm)',
                              width: '12rem',
                            }}
                            onChange={(e) => setEditingSerial(prev => ({ ...prev, [item.id]: e.target.value }))}
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

        {order.status === 'Packed' && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            background: 'color-mix(in srgb, #16a34a 10%, transparent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}>
            <CheckCircle2 color="#16a34a" size={20} />
            <div>
              <b>All equipment packed & verified:</b> The kit is ready for truck dispatch to customer site.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
