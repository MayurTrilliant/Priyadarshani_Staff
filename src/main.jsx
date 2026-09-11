import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, ImageUp, RotateCcw, X } from 'lucide-react';
import schoolLogo from './assets/priyadarshani-school-logo-transparent.png';
import './styles.css';
import TeacherPhoto from './assets/Teacher.jpg';

const GOOGLE_SHEET_WEB_APP_URL = import.meta.env.VITE_GOOGLE_SHEET_WEB_APP_URL || '';

const initialForm = {
  fullName: '',
  designation: '',
  birthdate: '',
  bloodGroup: '',
  address: '',
  emergencyContact: '',
  photo: '',
};

const initialBirthdateParts = {
  day: '',
  month: '',
  year: '',
};

const monthOptions = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function getDaysInMonth(month, year) {
  if (!month) return 31;
  const selectedYear = Number(year) || new Date().getFullYear();
  return new Date(selectedYear, Number(month), 0).getDate();
}

function buildBirthdate(parts) {
  if (!parts.day || !parts.month || !parts.year) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatBirthdate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function validateForm(form) {
  const errors = {};
  const name = form.fullName.trim();
  const address = form.address.trim();
  const phonePattern = /^[6-9]\d{9}$/;

  if (!name) errors.fullName = 'Full name is required.';
  else if (name.length < 3) errors.fullName = 'Name must be at least 3 characters.';
  else if (name.length > 30) errors.fullName = 'Name must be 30 characters or less.';
  else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) errors.fullName = 'Use letters, spaces, apostrophe, dot or hyphen only.';

  if (!form.bloodGroup.trim()) errors.bloodGroup = 'Blood group is required.';
  else if (form.bloodGroup.trim().length > 12) errors.bloodGroup = 'Blood group must be 12 characters or less.';

if (!form.birthdate) {
  errors.birthdate = 'Birthdate is required.';
} else {
  const selected = new Date(`${form.birthdate}T00:00:00`);
  const today = new Date();

  if (selected > today) {
    errors.birthdate = 'Birthdate cannot be in the future.';
  }
}

  if (!address) errors.address = 'Address is required.';
  else if (address.length < 10) errors.address = 'Address must be at least 10 characters.';
  else if (address.length > 80) errors.address = 'Address must be 80 characters or less.';

  if (!form.emergencyContact) errors.emergencyContact = 'Emergency contact number is required.';
  else if (!phonePattern.test(form.emergencyContact)) {
    errors.emergencyContact = 'Enter a valid 10 digit mobile number.';
  }

  if (!form.photo) errors.photo = "Please upload and crop the teacher's passport size photo.";

  return errors;
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });
  const [successPopupOpen, setSuccessPopupOpen] = useState(false);
  const [birthdateParts, setBirthdateParts] = useState(initialBirthdateParts);

  const characterCounts = {
    fullName: form.fullName.trim().length,
    address: form.address.trim().length,
    emergencyContact: form.emergencyContact.length,
  };

  const visibleErrors = useMemo(() => {
    const next = {};
    Object.keys(errors).forEach((key) => {
      if (touched[key]) next[key] = errors[key];
    });
    return next;
  }, [errors, touched]);

  function updateField(field, value) {
    const cleanValue = field.includes('Contact') ? value.replace(/\D/g, '').slice(0, 10) : value;
    const nextForm = { ...form, [field]: cleanValue };
    setForm(nextForm);
    setErrors(validateForm(nextForm));
  }

  function updateBirthdatePart(part, value) {
    const nextParts = { ...birthdateParts, [part]: value };
    const maxDay = getDaysInMonth(nextParts.month, nextParts.year);

    if (nextParts.day && Number(nextParts.day) > maxDay) {
      nextParts.day = String(maxDay).padStart(2, '0');
    }

    const nextForm = { ...form, birthdate: buildBirthdate(nextParts) };
    setBirthdateParts(nextParts);
    setForm(nextForm);
    setErrors(validateForm(nextForm));
  }

  function markTouched(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function handlePreview(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setTouched({
      fullName: true,
      birthdate: true,
      bloodGroup: true,
      address: true,
      emergencyContact: true,
      photo: true,
    });

    if (Object.keys(nextErrors).length === 0) {
      setPreviewOpen(true);
      setSubmitState({ status: 'idle', message: '' });
    }
  }

  async function submitToGoogleSheets() {
    if (!GOOGLE_SHEET_WEB_APP_URL) {
      setSubmitState({
        status: 'error',
        message: 'Add VITE_GOOGLE_SHEET_WEB_APP_URL in .env to connect this form with Google Sheets.',
      });
      return;
    }

    setSubmitState({ status: 'loading', message: 'Submitting details...' });

    try {
      const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          designation: form.designation,
          birthdate: formatBirthdate(form.birthdate),
          bloodGroup: form.bloodGroup,
          address: form.address.trim(),
          emergencyContact: form.emergencyContact,
          photo: form.photo,
          photoFileName: `${form.fullName.trim().replace(/[^A-Za-z0-9]+/g, '-') || 'teacher'}-${Date.now()}.jpg`,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (response.type === 'opaque' || response.ok) {
        setPreviewOpen(false);
        setForm(initialForm);
        setBirthdateParts(initialBirthdateParts);
        setTouched({});
        setErrors({});
        setSubmitState({ status: 'success', message: 'Details submitted successfully.' });
        setSuccessPopupOpen(true);
        window.setTimeout(() => {
          setSuccessPopupOpen(false);
          setSubmitState({ status: 'idle', message: '' });
        }, 2000);
      } else {
        throw new Error('Submission failed.');
      }
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: 'Unable to submit right now. Please check the Google Sheets web app URL.',
      });
    }
  }

  function handlePhotoSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((current) => ({ ...current, photo: 'Please select a valid image file.' }));
      setTouched((current) => ({ ...current, photo: true }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, photo: 'Photo must be less than 5 MB.' }));
      setTouched((current) => ({ ...current, photo: true }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCropSource(reader.result);
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function handleCropComplete(croppedImage) {
    const nextForm = { ...form, photo: croppedImage };
    setForm(nextForm);
    setCropSource('');
    setTouched((current) => ({ ...current, photo: true }));
    setErrors(validateForm(nextForm));
  }

  return (
    <main className="page-shell">
      <div className={submitState.status === 'loading' ? 'app-content is-blurred' : 'app-content'}>
        <header className="school-header">
          <img src={schoolLogo} alt="Priyadarshani School, Waki Khurd, Chakan, Pune" />
          <p>2026-2027</p>
        </header>

        <form className="admission-form" onSubmit={handlePreview} noValidate>
          <TextField
            label="Full Name"
            name="fullName"
            value={form.fullName}
            maxLength={30}
            count={`${characterCounts.fullName} / 30`}
            error={visibleErrors.fullName}
            onBlur={() => markTouched('fullName')}
            onChange={(value) => updateField('fullName', value)}
          />

          <TextField
            label="Designation"
            name="designation"
            value={form.designation}
            onChange={(value) => updateField('designation', value)}
          />

          <DateField
            label="Birthdate"
            name="birthdate"
            parts={birthdateParts}
            error={visibleErrors.birthdate}
            onBlur={() => markTouched('birthdate')}
            onChange={updateBirthdatePart}
          />

          <BloodGroupField
            label="Blood Group"
            name="bloodGroup"
            value={form.bloodGroup}
            error={visibleErrors.bloodGroup}
            onBlur={() => markTouched('bloodGroup')}
            onChange={(value) => updateField('bloodGroup', value)}
          />

          <TextAreaField
            label="Address"
            name="address"
            value={form.address}
            maxLength={80}
            count={`${characterCounts.address} / 80`}
            error={visibleErrors.address}
            onBlur={() => markTouched('address')}
            onChange={(value) => updateField('address', value)}
          />

          <TextField
            label="Emergency Contact Number"
            name="emergencyContact"
            value={form.emergencyContact}
            inputMode="numeric"
            maxLength={10}
            count={`${characterCounts.emergencyContact} / 10`}
            error={visibleErrors.emergencyContact}
            onBlur={() => markTouched('emergencyContact')}
            onChange={(value) => updateField('emergencyContact', value)}
          />

          <section className="photo-section">
            <div className="field-row">
              <label>Teacher's Passport Size Photo</label>
            </div>
<div className={`photo-preview ${visibleErrors.photo ? 'has-error' : ''}`}>
  {form.photo ? (
    <img src={form.photo} alt="Cropped teacher passport size" />
  ) : (
    <img src={TeacherPhoto} alt="Sample teacher passport size" />
  )}
</div>

            <div className="sample-ratio">Sample (3:4)</div>

            <label className="upload-button">
              <ImageUp size={18} />
              Upload from Gallery
              <input type="file" accept="image/*" onChange={handlePhotoSelect} />
            </label>

            {visibleErrors.photo && <p className="error-text">{visibleErrors.photo}</p>}
          </section>

          {submitState.status === 'error' && <p className="form-alert error-text">{submitState.message}</p>}

          <button className="primary-button" type="submit">
            Preview Details
          </button>
        </form>

        {cropSource && (
          <PhotoCropper
            source={cropSource}
            onCancel={() => setCropSource('')}
            onComplete={handleCropComplete}
          />
        )}

        {previewOpen && (
          <PreviewModal
            form={form}
            submitState={submitState}
            onClose={() => setPreviewOpen(false)}
            onSubmit={submitToGoogleSheets}
          />
        )}
      </div>

      {submitState.status === 'loading' && <LoadingOverlay />}
      {successPopupOpen && <SuccessPopup />}
    </main>
  );
}

function TextField({ label, name, value, count, error, onChange, onBlur, ...props }) {
  return (
    <div className="field">
      <div className="field-row">
        <label htmlFor={name}>{label}</label>
        {count && <span>{count}</span>}
      </div>
      <input
        id={name}
        name={name}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function DateField({ label, name, parts, error, onChange, onBlur }) {
  const currentYear = new Date().getFullYear();
const years = Array.from(
  { length: currentYear - 1990 + 1 },
  (_, index) => String(currentYear - index)
);
  const days = Array.from({ length: getDaysInMonth(parts.month, parts.year) }, (_, index) =>
    String(index + 1).padStart(2, '0'),
  );

  return (
    <div className="field">
      <div className="field-row">
        <label htmlFor={name}>{label}</label>
      </div>
      <div className="date-shell">
        <select
          id={`${name}-day`}
          name={`${name}-day`}
          value={parts.day}
          onBlur={onBlur}
          onChange={(event) => onChange('day', event.target.value)}
          aria-invalid={Boolean(error)}
        >
          <option value="">Day</option>
          {days.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <select
          id={name}
          name={`${name}-month`}
          value={parts.month}
          onBlur={onBlur}
          onChange={(event) => onChange('month', event.target.value)}
          aria-invalid={Boolean(error)}
        >
          <option value="">Month</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <select
          id={`${name}-year`}
          name={`${name}-year`}
          value={parts.year}
          onBlur={onBlur}
          onChange={(event) => onChange('year', event.target.value)}
          aria-invalid={Boolean(error)}
        >
          <option value="">Year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function BloodGroupField({ label, name, value, error, onChange, onBlur }) {
  const customInputRef = useRef(null);
  const isCommonGroup = bloodGroupOptions.includes(value);
  const customValue = isCommonGroup ? '' : value;

  function selectOther() {
    onChange(customValue || '');
    window.setTimeout(() => customInputRef.current?.focus(), 0);
  }

  return (
    <div className="field">
      <div className="field-row">
        <label>{label}</label>
      </div>
      <div className="blood-group-options" role="radiogroup" aria-label={label}>
        {bloodGroupOptions.map((group) => (
          <button
            className={value === group ? 'blood-group-option is-selected' : 'blood-group-option'}
            key={group}
            type="button"
            role="radio"
            aria-checked={value === group}
            onBlur={onBlur}
            onClick={() => onChange(group)}
          >
            {group}
          </button>
        ))}
        {/* <button
          className={!isCommonGroup && value ? 'blood-group-option is-selected' : 'blood-group-option'}
          type="button"
          role="radio"
          aria-checked={!isCommonGroup && Boolean(value)}
          onBlur={onBlur}
          onClick={selectOther}
        >
          Other
        </button> */}
      </div>
      {/* <input
        ref={customInputRef}
        className="blood-group-custom"
        name={`${name}-other`}
        value={customValue}
        maxLength={12}
        placeholder="Enter other blood group"
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      /> */}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function TextAreaField({ label, name, value, count, error, onChange, onBlur, ...props }) {
  return (
    <div className="field">
      <div className="field-row">
        <label htmlFor={name}>{label}</label>
        {count && <span>{count}</span>}
      </div>
      <textarea
        id={name}
        name={name}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function PhotoCropper({ source, onCancel, onComplete }) {
  const imageRef = useRef(null);
  const stageRef = useRef(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageBox, setImageBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [drag, setDrag] = useState(null);
  const cropAspect = 3 / 4;

  function prepareImage() {
    const image = imageRef.current;
    const stage = stageRef.current;
    if (!image || !stage) return;

    const stageRect = stage.getBoundingClientRect();
    const fitScale = Math.min(stageRect.width / image.naturalWidth, stageRect.height / image.naturalHeight);
    const fittedImage = {
      x: (stageRect.width - image.naturalWidth * fitScale) / 2,
      y: (stageRect.height - image.naturalHeight * fitScale) / 2,
      width: image.naturalWidth * fitScale,
      height: image.naturalHeight * fitScale,
    };
    const cropWidth = Math.min(fittedImage.width * 0.78, fittedImage.height * 0.78 * cropAspect);
    const cropHeight = cropWidth / cropAspect;

    setImageBox(fittedImage);
    setCropBox({
      x: fittedImage.x + (fittedImage.width - cropWidth) / 2,
      y: fittedImage.y + (fittedImage.height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    });
    setImageReady(true);
  }

  function clampCrop(nextCrop) {
    const minWidth = 72;
    const maxWidth = Math.min(imageBox.width, imageBox.height * cropAspect);
    const width = Math.min(Math.max(nextCrop.width, minWidth), maxWidth);
    const height = width / cropAspect;
    const x = Math.min(Math.max(nextCrop.x, imageBox.x), imageBox.x + imageBox.width - width);
    const y = Math.min(Math.max(nextCrop.y, imageBox.y), imageBox.y + imageBox.height - height);

    return { x, y, width, height };
  }

  function resizeFromHandle(handle, dx, dy, start) {
    const centerX = start.x + start.width / 2;
    const centerY = start.y + start.height / 2;
    const left = start.x;
    const right = start.x + start.width;
    const top = start.y;
    const bottom = start.y + start.height;
    let width = start.width;
    let x = start.x;
    let y = start.y;

    if (handle.includes('e')) width = start.width + dx;
    if (handle.includes('w')) width = start.width - dx;
    if (handle === 'n' || handle === 's') width = (start.height + (handle === 's' ? dy : -dy)) * cropAspect;

    const maxWidth = Math.min(imageBox.width, imageBox.height * cropAspect);
    width = Math.min(Math.max(width, 72), maxWidth);
    const height = width / cropAspect;

    if (handle.includes('w')) x = right - width;
    if (handle.includes('e')) x = left;
    if (handle === 'n' || handle === 's') x = centerX - width / 2;

    if (handle.includes('n')) y = bottom - height;
    if (handle.includes('s')) y = top;
    if (handle === 'e' || handle === 'w') y = centerY - height / 2;

    return clampCrop({ x, y, width, height });
  }

  function handleCropPointerDown(event, action, handle = '') {
    event.stopPropagation();
    stageRef.current?.setPointerCapture(event.pointerId);
    setDrag({
      action,
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: cropBox,
    });
  }

  function handlePointerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.action === 'move') {
      setCropBox(
        clampCrop({
          ...drag.startCrop,
          x: drag.startCrop.x + dx,
          y: drag.startCrop.y + dy,
        }),
      );
      return;
    }

    setCropBox(resizeFromHandle(drag.handle, dx, dy, drag.startCrop));
  }

  function handlePointerUp() {
    setDrag(null);
  }

  function resetCrop() {
    const cropWidth = Math.min(imageBox.width * 0.78, imageBox.height * 0.78 * cropAspect);
    const cropHeight = cropWidth / cropAspect;
    setCropBox({
      x: imageBox.x + (imageBox.width - cropWidth) / 2,
      y: imageBox.y + (imageBox.height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    });
  }

  function createCrop() {
    const image = imageRef.current;
    if (!image) return;

    const outputWidth = 600;
    const outputHeight = 800;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const scaleX = image.naturalWidth / imageBox.width;
    const scaleY = image.naturalHeight / imageBox.height;
    const sourceX = (cropBox.x - imageBox.x) * scaleX;
    const sourceY = (cropBox.y - imageBox.y) * scaleY;
    const sourceWidth = cropBox.width * scaleX;
    const sourceHeight = cropBox.height * scaleY;

    context.fillStyle = '#f4f5f7';
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    onComplete(canvas.toDataURL('image/jpeg', 0.9));
  }

  return (
    <div className="modal-backdrop">
      <section className="crop-dialog" role="dialog" aria-modal="true" aria-label="Crop teacher passport size photo">
        <div className="modal-header">
          <h2>Crop Photo</h2>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close cropper">
            <X size={24} />
          </button>
        </div>

        <div
          className="crop-stage"
          ref={stageRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            ref={imageRef}
            src={source}
            alt=""
            onLoad={prepareImage}
            style={{
              width: imageBox.width ? `${imageBox.width}px` : 'auto',
              height: imageBox.height ? `${imageBox.height}px` : 'auto',
              left: `${imageBox.x}px`,
              top: `${imageBox.y}px`,
            }}
            draggable="false"
          />
          {imageReady && (
            <>
              <div className="crop-shade crop-shade-top" style={{ height: `${cropBox.y}px` }} />
              <div
                className="crop-shade crop-shade-left"
                style={{
                  top: `${cropBox.y}px`,
                  width: `${cropBox.x}px`,
                  height: `${cropBox.height}px`,
                }}
              />
              <div
                className="crop-shade crop-shade-right"
                style={{
                  top: `${cropBox.y}px`,
                  left: `${cropBox.x + cropBox.width}px`,
                  height: `${cropBox.height}px`,
                }}
              />
              <div
                className="crop-shade crop-shade-bottom"
                style={{
                  top: `${cropBox.y + cropBox.height}px`,
                }}
              />
              <div
                className="crop-box"
                style={{
                  left: `${cropBox.x}px`,
                  top: `${cropBox.y}px`,
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                }}
                onPointerDown={(event) => handleCropPointerDown(event, 'move')}
              >
                <div className="crop-grid" />
                {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
                  <button
                    className={`crop-handle crop-handle-${handle}`}
                    key={handle}
                    type="button"
                    aria-label={`Resize crop ${handle}`}
                    onPointerDown={(event) => handleCropPointerDown(event, 'resize', handle)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="crop-controls">
          <button className="secondary-button icon-text" type="button" onClick={resetCrop}>
            <RotateCcw size={17} />
            Reset
          </button>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" type="button" onClick={createCrop} disabled={!imageReady}>
            Apply Crop
          </button>
        </div>
      </section>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="submit-overlay" role="status" aria-live="polite">
      <div className="submit-loader-card">
        <div className="submit-spinner" />
        <strong>Submitting details...</strong>
      </div>
    </div>
  );
}

function SuccessPopup() {
  return (
    <div className="success-popup-backdrop" role="status" aria-live="polite">
      <div className="success-popup">
        <span className="success-mark">
          <Check size={24} />
        </span>
        <strong>Details submitted successfully</strong>
      </div>
    </div>
  );
}

function PreviewModal({ form, submitState, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop">
      <section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="modal-header">
          <h2 id="confirm-title">Confirm Your Details</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close preview">
            <X size={26} />
          </button>
        </div>

        <div className="preview-body">
          <p className="warning-copy">Please review all your details carefully. This action is final.</p>
          <PreviewItem label="Full Name" value={form.fullName} />
          <PreviewItem label="Designation" value={form.designation} />
          <PreviewItem label="Birthdate" value={formatBirthdate(form.birthdate)} />
          <PreviewItem label="Blood Group" value={form.bloodGroup} />
          <PreviewItem label="Address" value={form.address} />
          <PreviewItem label="Emergency Contact Number" value={form.emergencyContact} />

          <div className="preview-item">
            <span>Teacher's Passport Size Photo</span>
            <img className="preview-photo" src={form.photo} alt="Teacher passport size" />
          </div>

          {submitState.message && (
            <p className={submitState.status === 'error' ? 'error-text' : 'success-text'}>{submitState.message}</p>
          )}
        </div>

        <div className="modal-actions sticky-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Edit
          </button>
          <button
            className="primary-button icon-text"
            type="button"
            onClick={onSubmit}
            disabled={submitState.status === 'loading'}
          >
            <Check size={18} />
            {submitState.status === 'loading' ? 'Submitting...' : 'Confirm & Submit'}
          </button>
        </div>
      </section>
    </div>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div className="preview-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
