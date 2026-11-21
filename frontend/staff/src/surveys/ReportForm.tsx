import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { ApiError } from '../api/errors';
import { submitReport, SURVEYS_KEY, type Report, type Survey } from '../api/surveys';
import { FormNotice, SubmitButton } from '../components/SubmitButton';
import { Icon } from '../components/Icon';

type Field = { key: keyof Omit<Report, 'gridSuitable' | 'notes'>; label: string; unit: string; min: string; max: string };
const FIELDS: Field[] = [
  { key: 'shadowFreeRoofAreaSquareMetres', label: 'Shadow-free roof area', unit: 'm²', min: '0.01', max: '9999999999.99' },
  { key: 'monthlyBillRupees', label: 'Monthly electricity bill', unit: '₹', min: '0', max: '9999999999.99' },
  { key: 'roofDirectionDegrees', label: 'Roof direction', unit: '° from north', min: '0', max: '359.99' },
  { key: 'roofTiltDegrees', label: 'Roof tilt', unit: '°', min: '0', max: '90' },
  { key: 'cableDistanceMetres', label: 'Cable distance', unit: 'm', min: '0.01', max: '9999999999.99' },
];

export function ReportForm({ survey }: { survey: Survey }) {
  const client = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: (values: Report) => submitReport(survey.id, values) });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const value = (key: string) => Number(form.get(key));
    const values: Report = {
      shadowFreeRoofAreaSquareMetres: value('shadowFreeRoofAreaSquareMetres'), monthlyBillRupees: value('monthlyBillRupees'),
      roofDirectionDegrees: value('roofDirectionDegrees'), roofTiltDegrees: value('roofTiltDegrees'), cableDistanceMetres: value('cableDistanceMetres'),
      gridSuitable: form.get('gridSuitable') === 'true', notes: String(form.get('notes') ?? '').trim() || null,
    };
    try {
      await mutation.mutateAsync(values);
      await client.invalidateQueries({ queryKey: SURVEYS_KEY });
    } catch (error) {
      const details = error instanceof ApiError ? Object.values(error.fields).flat().join(' ') : '';
      setNotice(error instanceof ApiError ? `${error.message}${details ? ` ${details}` : ''}` : 'Could not submit the report. Try again.');
      if (error instanceof ApiError && error.kind === 'conflict') void client.invalidateQueries({ queryKey: SURVEYS_KEY });
    }
  };
  return <section className="survey-panel" aria-labelledby="report-heading">
    <h2 className="a-heading" id="report-heading">Submit the site report</h2>
    <p>Record the measurements from the visit. The office will review them before the project can move forward.</p>
    <form className="survey-form" onSubmit={event => void submit(event)}>
      {notice && <FormNotice>{notice}</FormNotice>}
      <div className="survey-fields">{FIELDS.map(field => <div className="field" key={field.key}>
        <label className="field-label" htmlFor={field.key}>{field.label} <span className="survey-unit">{field.unit}</span></label>
        <div className="control"><input id={field.key} name={field.key} type="number" inputMode="decimal" required min={field.min} max={field.max} step="0.01" /></div>
      </div>)}
        <div className="field"><label className="field-label" htmlFor="gridSuitable">Is the grid connection suitable?</label><div className="control">
          <select id="gridSuitable" name="gridSuitable" required defaultValue=""><option value="">Choose an answer</option><option value="true">Yes</option><option value="false">No</option></select>
          <Icon icon={ChevronDown} className="chev" />
        </div></div>
      </div>
      <div className="field"><label className="field-label" htmlFor="survey-notes">Notes <span className="opt">Optional</span></label>
        <div className="control control-area"><textarea id="survey-notes" name="notes" maxLength={2000} /></div></div>
      <div className="survey-actions"><SubmitButton busy={mutation.isPending}>Submit report</SubmitButton></div>
    </form>
  </section>;
}
