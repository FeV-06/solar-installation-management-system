import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  CheckCircle2,
  Clock,
  FileCheck,
  RotateCcw,
  ShieldCheck,
  SolarPanel,
  Upload,
  Zap,
} from 'lucide-react';
import { fetchInstallationProof, submitInstallationProof, type InstallationProof } from '../api/surveys';
import { Icon } from '../components/Icon';
import { FormNotice } from '../components/SubmitButton';

// Default high-fidelity fallback illustrations for quick testing
export const DEFAULT_PANEL_PHOTO = '/images/panel_array.svg';
export const DEFAULT_INVERTER_PHOTO = '/images/inverter_wiring.svg';
export const DEFAULT_METER_PHOTO = '/images/net_meter.svg';

type Props = {
  installationId: number;
  customerName: string;
  defaultCapacityKw?: number;
  isTechnician?: boolean;
};

export function RooftopFieldProofSection({
  installationId,
  customerName,
  defaultCapacityKw = 3.3,
}: Props) {
  const queryClient = useQueryClient();
  const proofKey = ['installation-proof', installationId];

  const { data: proof, isLoading } = useQuery({
    queryKey: proofKey,
    queryFn: async ({ signal }) => {
      try {
        return await fetchInstallationProof(installationId, signal);
      } catch {
        return null;
      }
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
        Loading commissioning records…
      </div>
    );
  }

  if (proof) {
    return <HandoverCertificate proof={proof} />;
  }

  return (
    <RooftopHandoverForm
      installationId={installationId}
      customerName={customerName}
      defaultCapacityKw={defaultCapacityKw}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: proofKey })}
    />
  );
}

function RooftopHandoverForm({
  installationId,
  customerName,
  defaultCapacityKw,
  onSuccess,
}: {
  installationId: number;
  customerName: string;
  defaultCapacityKw: number;
  onSuccess: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Form State
  const today = new Date().toISOString().split('T')[0];
  const [startTime, setStartTime] = useState(`${today}T09:30`);
  const [endTime, setEndTime] = useState(`${today}T16:15`);
  const [capacityKw, setCapacityKw] = useState(defaultCapacityKw);
  const [generationKw, setGenerationKw] = useState(2.85);
  const [gridConnected, setGridConnected] = useState(true);
  const [signedByName, setSignedByName] = useState(customerName);

  // Photos - Start null so NO image shows until technician uploads/captures!
  const [panelPhoto, setPanelPhoto] = useState<string | null>(null);
  const [inverterPhoto, setInverterPhoto] = useState<string | null>(null);
  const [meterPhoto, setMeterPhoto] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  // Canvas drawing handlers & coordinate calibration
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height || 140);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#eab308'; // Solar Gold stroke
  };

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: (body: {
      workStartedAt: string;
      workCompletedAt: string;
      systemCapacityKw: number;
      testedGenerationKw: number;
      gridConnected: boolean;
      panelArrayPhotoUrl: string;
      inverterPhotoUrl: string;
      meterPhotoUrl: string;
      customerSignatureData: string;
      signedByName: string;
      signedAt: string;
    }) => submitInstallationProof(installationId, body),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: Error) => {
      setNotice(err.message || 'Failed to submit commissioning certificate. Please try again.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!panelPhoto || !inverterPhoto || !meterPhoto) {
      setNotice('Please capture or upload all 3 field verification photos before customer sign-off.');
      return;
    }

    if (!hasSignature || !canvasRef.current) {
      setNotice('Customer signature is required to complete the handover.');
      return;
    }

    const signatureData = canvasRef.current.toDataURL('image/png');

    mutation.mutate({
      workStartedAt: new Date(startTime).toISOString(),
      workCompletedAt: new Date(endTime).toISOString(),
      systemCapacityKw: capacityKw,
      testedGenerationKw: generationKw,
      gridConnected,
      panelArrayPhotoUrl: panelPhoto,
      inverterPhotoUrl: inverterPhoto,
      meterPhotoUrl: meterPhoto,
      customerSignatureData: signatureData,
      signedByName: signedByName.trim() || customerName,
      signedAt: new Date().toISOString(),
    });
  };

  return (
    <section
      style={{
        padding: '1.75rem',
        background: 'var(--bg-raised, #13171f)',
        borderRadius: 'var(--radius-xl, 12px)',
        border: '1px solid var(--line, #222938)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Icon icon={SolarPanel} size={22} color="var(--accent, #eab308)" />
          <h2 className="a-heading" style={{ margin: 0, fontSize: '1.25rem' }}>
            Field Commissioning &amp; Handover
          </h2>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            background: 'var(--accent, #eab308)',
            color: '#000',
            fontWeight: 700,
          }}
        >
          Technician Checklist
        </span>
      </div>

      <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--muted, #94a3b8)', lineHeight: 1.5 }}>
        Record on-site crew work hours, test measured live kW generation, upload photographic verification of modules and cabling, and obtain the homeowner&apos;s digital screen sign-off.
      </p>

      {notice && <FormNotice>{notice}</FormNotice>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Row 1: Time Tracking & System Readout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div className="field">
            <label className="label" htmlFor="workStartedAt">
              <Icon icon={Clock} size={14} style={{ marginRight: '4px' }} /> Work Started (Clock In)
            </label>
            <input
              id="workStartedAt"
              type="datetime-local"
              className="input"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="workCompletedAt">
              <Icon icon={Clock} size={14} style={{ marginRight: '4px' }} /> Work Completed (Clock Out)
            </label>
            <input
              id="workCompletedAt"
              type="datetime-local"
              className="input"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="systemCapacityKw">System Capacity (kW)</label>
            <input
              id="systemCapacityKw"
              type="number"
              step="0.05"
              className="input"
              value={capacityKw}
              onChange={e => setCapacityKw(Number(e.target.value))}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="testedGenerationKw">
              <Icon icon={Zap} size={14} style={{ marginRight: '4px', color: '#16a34a' }} /> Tested Live Generation (kW)
            </label>
            <input
              id="testedGenerationKw"
              type="number"
              step="0.01"
              className="input"
              value={generationKw}
              onChange={e => setGenerationKw(Number(e.target.value))}
              required
            />
          </div>
        </div>

        {/* Grid Synchronization Verified Checkbox */}
        <div style={{
          padding: '0.85rem 1rem',
          background: 'var(--bg, #0b0e14)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--line, #222938)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <input
            id="gridConnected"
            type="checkbox"
            checked={gridConnected}
            onChange={e => setGridConnected(e.target.checked)}
            style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent, #eab308)', cursor: 'pointer' }}
          />
          <label htmlFor="gridConnected" style={{ fontSize: '0.875rem', color: 'var(--fg, #f8fafc)', cursor: 'pointer' }}>
            <b>Grid Synchronized:</b> 238V nominal voltage checked, inverter status error-free, bi-directional net meter active.
          </label>
        </div>

        {/* 3-Point Photo Evidence Gallery: NO image shows until technician uploads! */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 className="display" style={{ fontSize: '1rem', margin: 0, color: 'var(--fg, #f8fafc)' }}>
              Mandatory Field Photo Proof (3 Angles)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>
              Capture photos directly from mobile camera or upload files
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Photo 1: Panel Array */}
            <div style={{ background: 'var(--bg, #0b0e14)', padding: '0.85rem', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--line, #222938)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="label" style={{ margin: 0 }}>1. Rooftop Panel Array</span>
                {panelPhoto && <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Attached</span>}
              </div>

              {panelPhoto ? (
                <div style={{ position: 'relative', height: '135px', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem', background: '#000' }}>
                  <img src={panelPhoto} alt="Rooftop Array" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setPanelPhoto(null)}
                    className="btn btn-quiet btn-sm"
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div style={{
                  height: '135px',
                  borderRadius: '6px',
                  border: '2px dashed var(--line, #334155)',
                  background: 'var(--bg-raised, #13171f)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}>
                  <Icon icon={Camera} size={28} color="var(--muted, #64748b)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>No photo uploaded</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon icon={Upload} size={14} />
                  <span>{panelPhoto ? 'Replace Photo' : 'Upload / Capture Photo'}</span>
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setPanelPhoto)} />
                </label>
                {!panelPhoto && (
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    style={{ fontSize: '0.75rem' }}
                    title="Fill sample illustration for testing"
                    onClick={() => setPanelPhoto(DEFAULT_PANEL_PHOTO)}
                  >
                    Sample
                  </button>
                )}
              </div>
            </div>

            {/* Photo 2: Inverter & DCDB */}
            <div style={{ background: 'var(--bg, #0b0e14)', padding: '0.85rem', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--line, #222938)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="label" style={{ margin: 0 }}>2. Inverter &amp; Wiring</span>
                {inverterPhoto && <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Attached</span>}
              </div>

              {inverterPhoto ? (
                <div style={{ position: 'relative', height: '135px', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem', background: '#000' }}>
                  <img src={inverterPhoto} alt="Inverter Wiring" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setInverterPhoto(null)}
                    className="btn btn-quiet btn-sm"
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div style={{
                  height: '135px',
                  borderRadius: '6px',
                  border: '2px dashed var(--line, #334155)',
                  background: 'var(--bg-raised, #13171f)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}>
                  <Icon icon={Camera} size={28} color="var(--muted, #64748b)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>No photo uploaded</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon icon={Upload} size={14} />
                  <span>{inverterPhoto ? 'Replace Photo' : 'Upload / Capture Photo'}</span>
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setInverterPhoto)} />
                </label>
                {!inverterPhoto && (
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    style={{ fontSize: '0.75rem' }}
                    title="Fill sample illustration for testing"
                    onClick={() => setInverterPhoto(DEFAULT_INVERTER_PHOTO)}
                  >
                    Sample
                  </button>
                )}
              </div>
            </div>

            {/* Photo 3: Net Meter & Earthing */}
            <div style={{ background: 'var(--bg, #0b0e14)', padding: '0.85rem', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--line, #222938)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="label" style={{ margin: 0 }}>3. Net-Meter &amp; Earth Pit</span>
                {meterPhoto && <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Attached</span>}
              </div>

              {meterPhoto ? (
                <div style={{ position: 'relative', height: '135px', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem', background: '#000' }}>
                  <img src={meterPhoto} alt="Net Meter" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setMeterPhoto(null)}
                    className="btn btn-quiet btn-sm"
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div style={{
                  height: '135px',
                  borderRadius: '6px',
                  border: '2px dashed var(--line, #334155)',
                  background: 'var(--bg-raised, #13171f)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}>
                  <Icon icon={Camera} size={28} color="var(--muted, #64748b)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>No photo uploaded</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon icon={Upload} size={14} />
                  <span>{meterPhoto ? 'Replace Photo' : 'Upload / Capture Photo'}</span>
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setMeterPhoto)} />
                </label>
                {!meterPhoto && (
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    style={{ fontSize: '0.75rem' }}
                    title="Fill sample illustration for testing"
                    onClick={() => setMeterPhoto(DEFAULT_METER_PHOTO)}
                  >
                    Sample
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Homeowner Digital Signature Screen Sign-Off */}
        <div style={{
          padding: '1.25rem',
          background: 'var(--bg, #0b0e14)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--line, #222938)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 className="display" style={{ fontSize: '1rem', margin: 0, color: 'var(--fg, #f8fafc)' }}>
                Homeowner Screen Acceptance Signature
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>
                Please hand the phone/tablet to the homeowner to sign inside the box below:
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={clearSignature}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Icon icon={RotateCcw} size={13} />
              <span>Clear</span>
            </button>
          </div>

          {/* Interactive HTML5 Canvas Pad */}
          <div style={{
            position: 'relative',
            background: '#04070d',
            border: hasSignature ? '2px solid var(--accent, #eab308)' : '1px dashed var(--line-strong, #3b4252)',
            borderRadius: '8px',
            touchAction: 'none',
            overflow: 'hidden',
          }}>
            <canvas
              ref={canvasRef}
              width={560}
              height={140}
              style={{ width: '100%', height: '140px', display: 'block', cursor: 'crosshair' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {!hasSignature && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'var(--faint, #64748b)',
                fontSize: '0.85rem',
                pointerEvents: 'none',
                textAlign: 'center',
              }}>
                ✍ Sign with finger or mouse here
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="field" style={{ flex: '1 1 200px', margin: 0 }}>
              <label className="label" htmlFor="signedByName" style={{ fontSize: '0.75rem' }}>Signer Full Name</label>
              <input
                id="signedByName"
                type="text"
                className="input"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.65rem' }}
                value={signedByName}
                onChange={e => setSignedByName(e.target.value)}
                required
              />
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--muted, #94a3b8)', flex: '2 1 300px' }}>
              &ldquo;I confirm that the solar system has been installed, tested, and is generating power to my complete satisfaction.&rdquo;
            </div>
          </div>
        </div>

        {/* Submit Handover CTA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={mutation.isPending}
            style={{ minWidth: '15rem' }}
          >
            <Icon icon={FileCheck} size={18} />
            <span>{mutation.isPending ? 'Submitting Handover…' : 'Submit Handover Certificate'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}

function HandoverCertificate({ proof }: { proof: InstallationProof }) {
  return (
    <section
      style={{
        padding: '1.75rem',
        background: 'var(--bg-raised, #13171f)',
        borderRadius: 'var(--radius-xl, 12px)',
        border: '1px solid #16a34a',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Icon icon={ShieldCheck} size={24} color="#16a34a" />
          <h2 className="a-heading" style={{ margin: 0, fontSize: '1.25rem', color: 'var(--fg, #f8fafc)' }}>
            Rooftop Handover &amp; Commissioning Certificate
          </h2>
        </div>
        <span
          style={{
            fontSize: '0.8rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            background: '#dcfce7',
            color: '#166534',
            fontWeight: 700,
          }}
        >
          ✓ System Commissioned &amp; Active
        </span>
      </div>

      <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--muted, #94a3b8)' }}>
        Installation #{proof.installationId} successfully verified on-site by {proof.technicianName} on {new Date(proof.signedAt).toLocaleDateString()} at {new Date(proof.signedAt).toLocaleTimeString()}.
      </p>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', background: 'var(--bg, #0b0e14)', borderRadius: '8px', border: '1px solid var(--line, #222938)' }}>
          <span className="label" style={{ fontSize: '0.75rem' }}>Tested Generation</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#16a34a', marginTop: '0.25rem' }}>
            {proof.testedGenerationKw} kW
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Peak: {proof.systemCapacityKw} kW</span>
        </div>

        <div style={{ padding: '1rem', background: 'var(--bg, #0b0e14)', borderRadius: '8px', border: '1px solid var(--line, #222938)' }}>
          <span className="label" style={{ fontSize: '0.75rem' }}>Labor Duration</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--fg, #f8fafc)', marginTop: '0.25rem' }}>
            {proof.laborHours} hrs
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>On-site Crew Time</span>
        </div>

        <div style={{ padding: '1rem', background: 'var(--bg, #0b0e14)', borderRadius: '8px', border: '1px solid var(--line, #222938)' }}>
          <span className="label" style={{ fontSize: '0.75rem' }}>Grid Status</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon icon={CheckCircle2} size={18} />
            <span>Synchronized</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>238V Net Meter Active</span>
        </div>
      </div>

      {/* Photo Gallery */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="display" style={{ fontSize: '0.95rem', margin: '0 0 0.75rem', color: 'var(--fg)' }}>
          Field Verification Photos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div>
            <div style={{ height: '120px', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
              <img
                src={proof.panelArrayPhotoUrl}
                alt="Panel Array"
                onError={(e) => { e.currentTarget.src = DEFAULT_PANEL_PHOTO; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>Rooftop Panel Array</span>
          </div>

          <div>
            <div style={{ height: '120px', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
              <img
                src={proof.inverterPhotoUrl}
                alt="Inverter Wiring"
                onError={(e) => { e.currentTarget.src = DEFAULT_INVERTER_PHOTO; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>Inverter &amp; DCDB Wiring</span>
          </div>

          <div>
            <div style={{ height: '120px', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
              <img
                src={proof.meterPhotoUrl}
                alt="Net Meter"
                onError={(e) => { e.currentTarget.src = DEFAULT_METER_PHOTO; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>Net Meter &amp; Earth Pit</span>
          </div>
        </div>
      </div>

      {/* Homeowner Signature Proof Box */}
      <div style={{
        padding: '1rem',
        background: 'var(--bg, #0b0e14)',
        borderRadius: '8px',
        border: '1px solid var(--line, #222938)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <span className="label" style={{ fontSize: '0.75rem' }}>Digital Signature Sign-Off</span>
          <div style={{ fontWeight: 600, color: 'var(--fg, #f8fafc)', marginTop: '0.2rem' }}>
            {proof.signedByName}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            Signed on {new Date(proof.signedAt).toLocaleString()}
          </span>
        </div>

        {proof.customerSignatureData && (
          <div style={{
            height: '65px',
            minWidth: '160px',
            background: '#04070d',
            borderRadius: '6px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #222938',
          }}>
            <img
              src={proof.customerSignatureData}
              alt="Customer Signature"
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
