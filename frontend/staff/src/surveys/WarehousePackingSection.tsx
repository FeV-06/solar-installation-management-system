import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
  QrCode,
  Truck,
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
      <div className="field-help" style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon icon={LoaderCircle} className="spin" />
        <span>Loading warehouse packing order…</span>
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

  const orderTone =
    order.status === 'Delivered'
      ? 'tone-positive'
      : order.status === 'Dispatched'
      ? 'tone-info'
      : order.status === 'Packed'
      ? 'tone-warning'
      : 'tone-neutral';

  return (
    <section className="survey-panel" aria-labelledby="warehouse-packing-title">
      <div className="section-title">
        <div>
          <h2 className="a-heading" id="warehouse-packing-title">Warehouse packing and dispatch</h2>
          <span className="a-label">
            Packing #{order.id}, {packedCount}/{totalCount} packed, {serialScannedCount}/{serialRequiredItems.length} serials scanned
          </span>
        </div>
        <span className={`chip ${orderTone}`}>
          {order.status}
        </span>
      </div>

      <p className="a-body">
        Order confirmed and advance paid. High-value inverters, batteries, and controllers require unique serial numbers before truck dispatch.
      </p>

      {errorMessage && (
        <div className="notice tone-negative" role="alert">
          <Icon icon={AlertTriangle} />
          <p className="notice-title">{errorMessage}</p>
        </div>
      )}

      <div className="table-wrap list-table">
        <table className="table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '3rem', textAlign: 'center' }}>Packed</th>
              <th scope="col">Item</th>
              <th scope="col">Category</th>
              <th scope="col" style={{ textAlign: 'center' }}>Quantity</th>
              <th scope="col">Serial number</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const serialValue = editingSerial[item.id] ?? item.serialNumber ?? '';
              const isMissingSerial = item.requiresSerialNumber && !item.serialNumber;

              return (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label={`Mark ${item.itemName} as packed`}
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
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{item.itemName}</span>
                      {item.requiresSerialNumber && (
                        <span className={`chip ${item.serialNumber ? 'tone-positive' : 'tone-negative'}`}>
                          {item.serialNumber ? 'Scanned' : 'Serial required'}
                        </span>
                      )}
                      {item.category === 'SolarPanels' && (
                        <span className="chip tone-warning">
                          20-yr warranty
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="dim">{item.category}</td>
                  <td className="num" style={{ textAlign: 'center' }}>
                    {item.quantity} {item.unit}
                  </td>
                  <td>
                    {item.requiresSerialNumber || item.category === 'SolarPanels' ? (
                      <div className="control" style={{ maxWidth: '16rem', height: '2.25rem' }}>
                        <input
                          type="text"
                          aria-label={`Serial number for ${item.itemName}`}
                          placeholder={item.category === 'SolarPanels' ? 'Batch / Module S/N…' : 'Scan or enter S/N…'}
                          value={serialValue}
                          disabled={order.status === 'Dispatched' || order.status === 'Delivered'}
                          style={{ color: isMissingSerial ? 'var(--negative)' : 'var(--fg)' }}
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
                        <Icon icon={QrCode} />
                      </div>
                    ) : (
                      <span className="dim a-small">Standard stock</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Notices */}
      {order.status === 'Pending' && !canDispatch && (
        <div className="notice tone-warning">
          <Icon icon={AlertTriangle} />
          <div>
            <p className="notice-title">Dispatch gate active</p>
            <p>Complete packing ({packedCount}/{totalCount}) and scan serial numbers for electronics ({serialScannedCount}/{serialRequiredItems.length}) before releasing the truck.</p>
          </div>
        </div>
      )}

      {order.status === 'Packed' && (
        <div className="notice tone-positive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Icon icon={CheckCircle2} />
            <div>
              <p className="notice-title">All hardware packed and serialized</p>
              <p>Hardware kit is verified for truck dispatch.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!canDispatch || dispatchOrder.isPending}
            onClick={() => dispatchOrder.mutate(order.id)}
          >
            {dispatchOrder.isPending ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={Truck} />}
            <span>Dispatch truck</span>
          </button>
        </div>
      )}

      {order.status === 'Dispatched' && (
        <div className="notice tone-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Icon icon={Truck} />
            <div>
              <p className="notice-title">Truck en route to customer site</p>
              <p>Dispatched at {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={deliverOrder.isPending}
            onClick={() => deliverOrder.mutate(order.id)}
          >
            {deliverOrder.isPending ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={PackageCheck} />}
            <span>Confirm site delivery</span>
          </button>
        </div>
      )}

      {order.status === 'Delivered' && (
        <div className="notice tone-positive">
          <Icon icon={CheckCircle2} />
          <div>
            <p className="notice-title">Delivered and handed over</p>
            <p>Delivery recorded at {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'recently'}. Hardware warranties have been auto-registered.</p>
          </div>
        </div>
      )}

      {/* Active Equipment Warranties */}
      {warrantiesQuery.data && warrantiesQuery.data.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <div className="section-title">
            <h3 className="a-heading">Active equipment warranties</h3>
            <span className="a-label">Automated warranty clocks</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            {warrantiesQuery.data.map((w) => (
              <div key={w.id} className="rec-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>{w.itemName}</span>
                  <span className={`chip ${w.isCovered ? 'tone-positive' : 'tone-negative'}`}>
                    {w.isCovered ? `${w.remainingDays} days left` : 'Expired'}
                  </span>
                </div>

                <div className="a-small" style={{ marginTop: '0.25rem' }}>
                  <span>Serial: </span>
                  <code style={{ fontWeight: 600, color: 'var(--fg)' }}>{w.serialNumber}</code>
                </div>

                <div className="a-small" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem', color: 'var(--faint)' }}>
                  <Icon icon={Calendar} />
                  <span>
                    {w.warrantyYears}-year coverage, valid until {new Date(w.expiryDate).toLocaleDateString()}
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
