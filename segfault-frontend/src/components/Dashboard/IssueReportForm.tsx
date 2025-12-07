import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PhotoUploader from './PhotoUploader';
import LocationPicker from '../Map/LocationPicker';
import { issueRoutes, type IssueType } from '../../api/routes';

interface IssueReportFormProps {
  open: boolean;
  onClose: () => void;
}

interface FormData {
  type: string;
  lat: number | null;
  lng: number | null;
  address: string;
  description: string;
  anonymous: boolean;
  photos: File[];
}

const STEPS = ['Issue Details', 'Location & Photos', 'Review & Submit'];

const IssueReportForm = ({ open, onClose }: IssueReportFormProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    type: '',
    lat: null,
    lng: null,
    address: '',
    description: '',
    anonymous: false,
    photos: [],
  });

  useEffect(() => {
    const fetchIssueTypes = async () => {
      try {
        setTypesLoading(true);
        const types = await issueRoutes.getIssueTypes();
        setIssueTypes(types);
      } catch (error) {
        console.error('Failed to fetch issue types:', error);
      } finally {
        setTypesLoading(false);
      }
    };

    if (open) {
      fetchIssueTypes();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setSubmitSuccess(false);
      setSubmitError(null);
      setFormData({
        type: '',
        lat: null,
        lng: null,
        address: '',
        description: '',
        anonymous: false,
        photos: [],
      });
    }
  }, [open]);

  const selectedType = issueTypes.find((t) => t.id === formData.type);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setSubmitError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }));
        setLocationLoading(false);
      },
      (error) => {
        setSubmitError(`Location error: ${error.message}`);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitIssue = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submitData = {
        type: formData.type,
        description: formData.description,
        isAnonymous: formData.anonymous,
        lat: formData.lat ?? undefined,
        lng: formData.lng ?? undefined,
        files: formData.photos,
      };

      await issueRoutes.reportIssue(submitData);
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setSubmitError('Failed to submit issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return Boolean(formData.type && formData.description.trim());
      case 1:
        return Boolean(formData.lat || formData.address.trim());
      case 2:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="issue-type-label">Issue Type</InputLabel>
              <Select
                labelId="issue-type-label"
                value={formData.type}
                label="Issue Type"
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                disabled={typesLoading}
              >
                {typesLoading ? (
                  <MenuItem disabled>Loading...</MenuItem>
                ) : (
                  issueTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))
                )}
              </Select>
              {selectedType && (
                <Typography variant="caption" color="primary" sx={{ mt: 1 }}>
                  Associated Department: {selectedType.department}
                </Typography>
              )}
            </FormControl>

            <TextField
              label="Description"
              placeholder="Describe the issue in detail..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              multiline
              rows={4}
              fullWidth
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <TextField
                label="Coordinates"
                value={formData.lat && formData.lng ? `${formData.lat.toFixed(6)}, ${formData.lng.toFixed(6)}` : ''}
                placeholder="Click button or use map to set location"
                fullWidth
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={locationLoading ? <CircularProgress size={16} color="inherit" /> : <MyLocationIcon />}
                        onClick={handleUseMyLocation}
                        disabled={locationLoading}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {locationLoading ? 'Getting...' : 'Use My Location'}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Or select on map
              </Typography>
              <LocationPicker
                lat={formData.lat}
                lng={formData.lng}
                onChange={(lat, lng) => setFormData((prev) => ({ ...prev, lat, lng }))}
              />
            </Box>

            <TextField
              label="Address Description"
              placeholder="e.g., Near the bus stop on Main Street"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              fullWidth
              helperText="Provide a description to help locate the issue"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Photos (Optional)
              </Typography>
              <PhotoUploader
                photos={formData.photos}
                onPhotosChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
                maxFiles={2}
              />
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review Your Report
            </Typography>

            <Box sx={{ backgroundColor: 'grey.50', p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Issue Type
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedType?.name || '-'}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {formData.description || '-'}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Location
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {formData.lat && formData.lng
                  ? `${formData.lat.toFixed(6)}, ${formData.lng.toFixed(6)}`
                  : formData.address || '-'}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Photos
              </Typography>
              <Typography variant="body1">
                {formData.photos.length} photo(s) attached
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.anonymous}
                  onChange={(e) => setFormData((prev) => ({ ...prev, anonymous: e.target.checked }))}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Report Anonymously
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Your identity will not be associated with this report
                  </Typography>
                </Box>
              }
            />

            {submitSuccess && (
              <Alert severity="success">
                Issue reported successfully! Closing...
              </Alert>
            )}

            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Report an Issue
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent dividers sx={{ minHeight: 300 }}>
        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
        )}
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepValid(activeStep)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={submitIssue}
            disabled={isSubmitting || submitSuccess}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default IssueReportForm;
