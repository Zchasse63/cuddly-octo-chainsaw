'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ChevronRight,
  Users,
  Download,
  X,
  Loader,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/useToast';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'complete';

interface ColumnMapping {
  csvColumn: string;
  targetField: string;
}

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  program?: string;
  [key: string]: string | undefined;
}

const TARGET_FIELDS = [
  { id: 'firstName', label: 'First Name', required: true },
  { id: 'lastName', label: 'Last Name', required: true },
  { id: 'email', label: 'Email', required: true },
  { id: 'phone', label: 'Phone', required: false },
  { id: 'program', label: 'Program', required: false },
  { id: 'startDate', label: 'Start Date', required: false },
  { id: 'notes', label: 'Notes', required: false },
];

export default function ImportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errors: Array<{ row: number; reason: string }> } | null>(null);

  const importClientsMutation = trpc.coachDashboard.importClients.useMutation({
    onSuccess: (result) => {
      const successCount = result.successCount || 0;
      showToast(`${successCount} clients imported successfully`, 'success');
    },
    onError: (error) => {
      showToast('Failed to import clients', 'error');
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    // File size validation (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrors(['File size exceeds 5MB limit']);
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

      // Sanitize CSV cells to prevent formula injection
      const sanitizeCell = (cell: string): string => {
        const trimmed = cell.trim().replace(/"/g, '');
        // Block cells starting with =, +, -, @, \t, \r (formula injection)
        if (/^[=+\-@\t\r]/.test(trimmed)) {
          return `'${trimmed}`; // Prefix with single quote to disable formula
        }
        return trimmed;
      };

      const data = lines.slice(1).map((line) =>
        line.split(',').map((cell) => sanitizeCell(cell))
      );

      setCsvHeaders(headers);
      setCsvData(data);

      // Auto-map columns
      const autoMappings: ColumnMapping[] = headers.map((header) => {
        const lowerHeader = header.toLowerCase();
        let targetField = '';

        if (lowerHeader.includes('first') && lowerHeader.includes('name')) targetField = 'firstName';
        else if (lowerHeader.includes('last') && lowerHeader.includes('name')) targetField = 'lastName';
        else if (lowerHeader.includes('email')) targetField = 'email';
        else if (lowerHeader.includes('phone')) targetField = 'phone';
        else if (lowerHeader.includes('program')) targetField = 'program';
        else if (lowerHeader.includes('date')) targetField = 'startDate';
        else if (lowerHeader.includes('note')) targetField = 'notes';

        return { csvColumn: header, targetField };
      });

      setMappings(autoMappings);
      setStep('mapping');
    };
    reader.readAsText(selectedFile);
  };

  const updateMapping = (csvColumn: string, targetField: string) => {
    setMappings(
      mappings.map((m) => (m.csvColumn === csvColumn ? { ...m, targetField } : m))
    );
  };

  const processData = () => {
    const parsed: ParsedRow[] = csvData.map((row) => {
      const obj: ParsedRow = { firstName: '', lastName: '', email: '' };
      mappings.forEach((mapping, index) => {
        if (mapping.targetField && row[index]) {
          obj[mapping.targetField] = row[index];
        }
      });
      return obj;
    });

    // Validate
    const validationErrors: string[] = [];
    parsed.forEach((row, index) => {
      if (!row.email) validationErrors.push(`Row ${index + 2}: Missing email`);
      if (!row.firstName) validationErrors.push(`Row ${index + 2}: Missing first name`);
      if (!row.lastName) validationErrors.push(`Row ${index + 2}: Missing last name`);
    });

    setErrors(validationErrors);
    setParsedData(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      return;
    }

    try {
      // Convert parsed data back to CSV format for API
      const csvContent = parsedData
        .map(row => [row.firstName, row.lastName, row.email, row.phone || '', row.program || '']
          .map(v => `"${v}"`)
          .join(','))
        .join('\n');

      const result = await importClientsMutation.mutateAsync({
        csvData: `First Name,Last Name,Email,Phone,Program\n${csvContent}`,
      });

      setImportResult(result as any);
      setStep('complete');
    } catch (err) {
      setStep('upload');
    }
  };

  const downloadTemplate = () => {
    const template = 'First Name,Last Name,Email,Phone,Program,Notes\nJohn,Doe,john@example.com,+1 555-0123,Strength Builder,"Starting fresh"\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voicefit_import_template.csv';
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Import Clients</h1>
          <p className="text-text-secondary">Bulk import clients from a CSV file</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {(['upload', 'mapping', 'preview', 'complete'] as ImportStep[]).map((s, index) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-accent-blue text-white'
                  : steps.indexOf(step) > index
                  ? 'bg-accent-green text-white'
                  : 'bg-background-tertiary text-text-secondary'
              }`}
            >
              {steps.indexOf(step) > index ? <Check className="w-4 h-4" /> : index + 1}
            </div>
            {index < 3 && (
              <div
                className={`w-12 h-1 mx-2 rounded ${
                  steps.indexOf(step) > index ? 'bg-accent-green' : 'bg-background-tertiary'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <Card variant="bordered" padding="lg">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging
                ? 'border-accent-blue bg-accent-blue/5'
                : 'border-background-tertiary hover:border-accent-blue'
            }`}
          >
            <FileSpreadsheet className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Drop your CSV file here</h3>
            <p className="text-text-secondary mb-4">or click to browse</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 bg-accent-blue text-white hover:bg-opacity-90 focus:ring-accent-blue px-4 py-2 text-base cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </label>
          </div>

          <div className="mt-6 p-4 bg-background-secondary rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Need a template?</h4>
                <p className="text-sm text-text-secondary">Download our CSV template to get started</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 'mapping' && (
        <Card variant="bordered" padding="lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Map Your Columns</h3>
            <p className="text-text-secondary">
              We&apos;ve auto-detected some mappings. Please verify and adjust as needed.
            </p>
          </div>

          <div className="space-y-4">
            {mappings.map((mapping) => (
              <div
                key={mapping.csvColumn}
                className="flex items-center gap-4 p-4 bg-background-secondary rounded-xl"
              >
                <div className="flex-1">
                  <p className="text-sm text-text-secondary">CSV Column</p>
                  <p className="font-medium">{mapping.csvColumn}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
                <div className="flex-1">
                  <p className="text-sm text-text-secondary">Maps to</p>
                  <select
                    value={mapping.targetField}
                    onChange={(e) => updateMapping(mapping.csvColumn, e.target.value)}
                    className="w-full px-4 py-2 bg-background-primary rounded-lg border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  >
                    <option value="">-- Skip this column --</option>
                    {TARGET_FIELDS.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label} {field.required ? '*' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button onClick={processData}>Continue to Preview</Button>
          </div>
        </Card>
      )}

      {step === 'preview' && (
        <Card variant="bordered" padding="lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Preview Import</h3>
            <p className="text-text-secondary">
              Review the data before importing. {parsedData.length} clients will be created.
            </p>
          </div>

          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-accent-red" />
                <h4 className="font-medium text-accent-red">Validation Errors</h4>
              </div>
              <ul className="text-sm text-accent-red space-y-1">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-background-tertiary">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Program</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b border-background-secondary">
                    <td className="py-3 px-4">{row.firstName} {row.lastName}</td>
                    <td className="py-3 px-4">{row.email}</td>
                    <td className="py-3 px-4">{row.phone || '-'}</td>
                    <td className="py-3 px-4">{row.program || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 10 && (
              <p className="text-center text-text-secondary py-4">
                Showing 10 of {parsedData.length} rows
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setStep('mapping')} disabled={importClientsMutation.isPending}>
              Back
            </Button>
            <Button onClick={handleImport} disabled={errors.length > 0 || importClientsMutation.isPending}>
              {importClientsMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Import {parsedData.length} Clients
                </>
              )}
            </Button>
          </div>

          {importClientsMutation.error && (
            <div className="mt-4 p-4 bg-accent-red/5 border border-accent-red/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-accent-red">Import failed</h4>
                <p className="text-sm text-accent-red mt-1">
                  {importClientsMutation.error.message || 'Unable to import clients. Please try again.'}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {step === 'complete' && (
        <Card variant="bordered" padding="lg" className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
          <p className="text-text-secondary mb-2">
            Successfully imported {importResult?.successCount || parsedData.length} clients.
          </p>
          <p className="text-text-secondary mb-6">
            They will receive invitation emails shortly.
          </p>

          {importResult?.errors && importResult.errors.length > 0 && (
            <div className="mb-6 p-4 bg-accent-orange/5 border border-accent-orange/20 rounded-xl text-left">
              <h4 className="font-medium text-accent-orange mb-2">
                {importResult.errors.length} row{importResult.errors.length > 1 ? 's' : ''} had issues:
              </h4>
              <ul className="text-sm text-accent-orange space-y-1">
                {importResult.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>Row {error.row}: {error.reason}</li>
                ))}
                {importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}
              </ul>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => router.push('/dashboard/clients')}>
              View Clients
            </Button>
            <Button onClick={() => {
              setStep('upload');
              setFile(null);
              setCsvHeaders([]);
              setCsvData([]);
              setMappings([]);
              setParsedData([]);
              setErrors([]);
              setImportResult(null);
            }}>
              Import More
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const steps: ImportStep[] = ['upload', 'mapping', 'preview', 'complete'];
