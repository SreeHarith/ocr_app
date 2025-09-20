'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { YourDataTable } from '@/components/your-data-table';
import EditDialog from '@/components/edit-dialog';
import { Contact } from '@/components/columns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import dynamic from 'next/dynamic';
import { Download, Upload, FileImage, Camera, FileText } from 'lucide-react';
import Papa from 'papaparse';

const DynamicCSVLink = dynamic(
  () => import('react-csv').then((mod) => mod.CSVLink),
  { ssr: false }
);

type DialogMode = 'csv' | 'ocr' | 'edit';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<Contact[]>([]);
  const [tableData, setTableData] = useState<Contact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isNotFoundDialogOpen, setIsNotFoundDialogOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>('edit');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);

  const videoRef = useCallback((node: HTMLVideoElement) => {
    if (node !== null) setVideoNode(node);
  }, []);

  const fetchContacts = useCallback(async () => {
    setIsTableLoading(true);
    try {
      const response = await fetch('/api/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const data = await response.json();
      setTableData(data);
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Could not load contacts from the database.");
    } finally {
      setIsTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    const handleVideoPlay = () => {
      videoNode?.play().catch(error => console.error("Error trying to play video:", error));
    };
    if (isCameraOpen && cameraStream && videoNode) {
      videoNode.srcObject = cameraStream;
      videoNode.addEventListener('loadedmetadata', handleVideoPlay);
    }
    return () => {
      videoNode?.removeEventListener('loadedmetadata', handleVideoPlay);
    };
  }, [isCameraOpen, cameraStream, videoNode]);
  
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const csvHeaders = [
    { label: "name", key: "name" },
    { label: "phone", key: "phone" },
    { label: "gender", key: "gender" },
    { label: "birthday", key: "birthday" },
    { label: "anniversary", key: "anniversary" }
  ];
  
  const sampleCsvData = [
    { name: "Rohan Sharma", phone: "\t+919876543210", gender: "male", birthday: "1992-03-10", anniversary: "" },
    { name: "Priya Patel", phone: "\t+917890123456", gender: "female", birthday: "1995-11-22", anniversary: "2020-06-01" },
  ];

  const getCSVData = () => {
    return tableData.map(contact => ({
      ...contact,
      phone: `\t${contact.phone}`
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    const newFile = event.target.files?.[0];
    if (newFile) {
      setFile(newFile);
      setImagePreviewUrl(URL.createObjectURL(newFile));
    } else {
      setFile(null);
      setImagePreviewUrl(null);
    }
    if(event.target) event.target.value = '';
  };

  const handleExtractClick = async () => {
    if (!file) {
      alert('Please select a file first.');
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.error || 'Failed to upload image.');
      
      const imageUrl = uploadData.url;
      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const validatedContacts = await ocrResponse.json();
      if (!ocrResponse.ok) throw new Error(validatedContacts.message || 'Failed to process image');

      if (Array.isArray(validatedContacts) && validatedContacts.length > 0) {
        setExtractedInfo(validatedContacts);
        setDialogMode('ocr');
        setIsDialogOpen(true);
      } else {
        setIsNotFoundDialogOpen(true);
      }
    } catch (error: any) {
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    new Promise<Contact[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          
          const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
          const phoneHeader = headers.find(h => h.toLowerCase().includes('phone'));
          const genderHeader = headers.find(h => h.toLowerCase().includes('gender'));
          const birthdayHeader = headers.find(h => h.toLowerCase().includes('birthday'));
          const anniversaryHeader = headers.find(h => h.toLowerCase().includes('anniversary'));

          if (!nameHeader || !phoneHeader) {
            return reject(new Error("Import failed: CSV must contain 'name' and 'phone' columns."));
          }

          const parsedContacts: Contact[] = results.data.map((row: any) => ({
            name: row[nameHeader] || '',
            phone: row[phoneHeader] || '',
            gender: (genderHeader ? row[genderHeader] : 'unknown').toLowerCase(),
            birthday: birthdayHeader ? row[birthdayHeader] : undefined,
            anniversary: anniversaryHeader ? row[anniversaryHeader] : undefined,
          }));
          resolve(parsedContacts);
        },
        error: (error: any) => reject(error),
      });
    })
    .then(async (parsedContacts) => {
      if (parsedContacts.length === 0) {
        alert("No valid contacts found in the CSV file.");
        return;
      }
      const response = await fetch('/api/contacts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedContacts),
      });
      const validatedContacts = await response.json();
      if (!response.ok) throw new Error(validatedContacts.message || 'Validation failed.');
      
      setExtractedInfo(validatedContacts);
      setDialogMode('csv');
      setIsDialogOpen(true);
    })
    .catch((err: Error) => {
        alert(err.message);
    })
    .finally(() => {
        setIsLoading(false);
        if(event.target) event.target.value = '';
    });
  };

  const handleOpenCamera = async () => {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setCameraStream(stream);
        setIsCameraOpen(true);
      } catch (err) {
        alert("Could not access the camera. Please check your browser permissions.");
      }
    } else {
      alert("Your browser does not support camera access.");
    }
  };

  const handleCloseCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
  };
  
  const handleCapture = () => {
    if (videoNode && canvasRef.current) {
      const canvas = canvasRef.current;
      if (videoNode.videoWidth === 0) return;
      canvas.width = videoNode.videoWidth;
      canvas.height = videoNode.videoHeight;
      canvas.getContext('2d')?.drawImage(videoNode, 0, 0, videoNode.videoWidth, videoNode.videoHeight);
      canvas.toBlob((blob) => {
        if (blob) {
          const capturedFile = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
          setFile(capturedFile);
          if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
          setImagePreviewUrl(URL.createObjectURL(capturedFile));
        }
      }, 'image/png');
      handleCloseCamera();
    }
  };

  const handleSave = async (data: Contact[]) => {
    if (data.length === 0) { setIsDialogOpen(false); return; }
    const contactToSave = data[0];
    try {
      let response;
      if (dialogMode === 'edit' && editingIndex !== null && contactToSave._id) {
        response = await fetch(`/api/contacts/${contactToSave._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactToSave),
        });
      } else {
        response = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      await fetchContacts();
      alert(result.message);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } 
    finally {
      setIsDialogOpen(false);
      setEditingIndex(null);
    }
  };

  const handleDeleteRow = async (index: number) => {
    const contactToDelete = tableData[index];
    if (!contactToDelete._id) return;
    if (confirm('Are you sure you want to delete this contact permanently?')) {
      try {
        const response = await fetch(`/api/contacts/${contactToDelete._id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        await fetchContacts();
        alert(result.message);
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    }
  };
  
  const handleEditRow = (index: number, contact: Contact) => {
    setExtractedInfo([contact]);
    setDialogMode('edit');
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold">OCR Contact Extractor</h1>
          <p className="text-muted-foreground mt-2">
            Upload, capture, or import a file to extract contact information.
          </p>
        </header>

        <div className="relative p-6 border rounded-lg bg-card shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-center md:text-left">Option 1: Extract from Image</h3>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                 <Input
                  id="picture"
                  type="file"
                  ref={imageInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                />
                <Button 
                  onClick={() => imageInputRef.current?.click()} 
                  variant="outline" 
                  className="w-full sm:w-auto"
                >
                  <FileImage className="mr-2 h-4 w-4" />
                  Choose File
                </Button>
                <Button 
                  onClick={handleOpenCamera} 
                  variant="outline" 
                  className="w-full sm:w-auto"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Use Camera
                </Button>
              </div>
              {file && (
                <p className="text-sm text-muted-foreground text-center sm:text-left truncate">
                  Selected: <strong>{file.name}</strong>
                </p>
              )}
               {/* ===== FIX: This button is now INSIDE the flex container ===== */}
               <Button 
                onClick={handleExtractClick} 
                disabled={!file || isLoading} 
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Extract from Image'}
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-center md:text-left">Option 2: Import from CSV</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                <Input
                  type="file"
                  ref={csvInputRef}
                  onChange={handleCsvImport}
                  className="hidden"
                  accept=".csv"
                />
                <Button 
                  onClick={() => csvInputRef.current?.click()} 
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV File
                </Button>
                
                <DynamicCSVLink
                  data={sampleCsvData}
                  headers={csvHeaders}
                  filename={"contacts-template.csv"}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <FileText className="h-4 w-4" />
                  Download Template
                </DynamicCSVLink>
              </div>
            </div>
          </div>
          {/* ===== FIX: Corrected the centering class from -translate-x-12 to -translate-x-1/2 ===== */}
          <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-px bg-border hidden md:block" />
        </div>

        {imagePreviewUrl && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-center">Image Preview</h2>
            <div className="flex justify-center">
              <div className="p-2 border-2 border-dashed rounded-lg">
                <img
                  src={imagePreviewUrl}
                  alt="Uploaded contact card"
                  className="max-w-md max-h-96 rounded-md object-contain"
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Saved Contacts</h2>
          {tableData.length > 0 && (
            <DynamicCSVLink
              data={getCSVData()}
              headers={csvHeaders}
              filename={"contacts.csv"}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </DynamicCSVLink>
          )}
        </div>
        
        <YourDataTable
          data={tableData}
          isLoading={isTableLoading}
          handleDeleteRow={handleDeleteRow}
          handleEditRow={handleEditRow}
        />

        <EditDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          data={extractedInfo}
          onSave={handleSave}
          mode={dialogMode}
        />
        
        <AlertDialog open={isNotFoundDialogOpen} onOpenChange={setIsNotFoundDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>No Contacts Found</AlertDialogTitle>
              <AlertDialogDescription>
                We could not detect a name or phone number in the uploaded image. Please try a different image or one with clearer text.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isCameraOpen} onOpenChange={(open) => !open && handleCloseCamera()}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Capture Image</DialogTitle>
            </DialogHeader>
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video rounded-md border bg-black" />
            <canvas ref={canvasRef} className="hidden" />
            <DialogFooter className="gap-2 sm:justify-center">
              <Button variant="outline" onClick={handleCloseCamera}>Cancel</Button>
              <Button onClick={handleCapture}>
                <Camera className="mr-2 h-4 w-4" />
                Capture Photo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}