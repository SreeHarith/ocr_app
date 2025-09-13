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
import { CSVLink } from 'react-csv';
import { Download, Upload, FileImage, Camera } from 'lucide-react';
import Papa from 'papaparse';


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

  // Standard refs for file inputs and canvas
  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ====================== SIMPLIFIED CALLBACK REF ======================
  // This is a simpler, more direct way to create a callback ref.
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);

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
  // ====================================================================
  
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const csvHeaders = [
    { label: "Name", key: "name" },
    { label: "Phone Number", key: "phone" },
    { label: "Gender", key: "gender" }
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
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload image.');
      }
      const imageUrl = uploadData.url;
      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const ocrData = await ocrResponse.json();
      if (!ocrResponse.ok) {
        throw new Error(ocrData.error || 'Failed to process image with OCR.');
      }
      if (Array.isArray(ocrData) && ocrData.length > 0) {
        setExtractedInfo(ocrData);
        setIsDialogOpen(true);
      } else {
        setIsNotFoundDialogOpen(true);
      }
    } catch (error: any) {
      console.error('An error occurred during extraction:', error);
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const importedContacts: Contact[] = results.data
            .map((row: any) => {
              const name = row.name || row.Name;
              const phone = row.phone || row['Phone Number'];
              const gender = (row.gender || row.Gender || 'unknown').toLowerCase();

              if (name && phone) {
                return {
                  name: String(name).trim(),
                  phone: String(phone).trim(),
                  gender: String(gender).trim(),
                };
              }
              return null;
            })
            .filter((contact): contact is Contact => contact !== null);

          if (importedContacts.length > 0) {
            setTableData(prevData => [...prevData, ...importedContacts]);
            alert(`${importedContacts.length} contacts imported successfully!`);
          } else {
            alert("Could not find valid contacts in the CSV file. Please ensure the file has 'name' and 'phone' columns.");
          }
        } catch (error) {
          console.error("Error parsing CSV:", error);
          alert("An error occurred while parsing the CSV file.");
        }
      },
      error: (error: any) => {
        console.error("CSV parsing error:", error);
        alert(`Error parsing CSV file: ${error.message}`);
      }
    });

    if(event.target) event.target.value = '';
  };

  const handleOpenCamera = async () => {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }
        });
        setCameraStream(stream);
        setIsCameraOpen(true);
      } catch (err) {
        console.error("Camera error:", err);
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

  const handleSave = (data: Contact[]) => {
    if (editingIndex !== null) {
      const updatedTableData = [...tableData];
      updatedTableData[editingIndex] = data[0];
      setTableData(updatedTableData);
      setEditingIndex(null);
    } else {
      setTableData((prevData) => [...prevData, ...data]);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteRow = (index: number) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      setTableData((prevData) => prevData.filter((_, i) => i !== index));
    }
  };

  const handleEditRow = (index: number, contact: Contact) => {
    setEditingIndex(index);
    setExtractedInfo([contact]);
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
              <div className="flex items-center justify-center md:justify-start">
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
                  className="w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV File
                </Button>
              </div>
            </div>

          </div>
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
            <CSVLink
              data={getCSVData()}
              headers={csvHeaders}
              filename={"contacts.csv"}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </CSVLink>
          )}
        </div>
        
        <YourDataTable
          data={tableData}
          handleDeleteRow={handleDeleteRow}
          handleEditRow={handleEditRow}
        />

        <EditDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          data={extractedInfo}
          onSave={handleSave}
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
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Capture Image</DialogTitle>
            </DialogHeader>
            {/* The ref prop now gets the state setter function directly */}
            <video ref={setVideoNode} autoPlay playsInline muted className="w-full aspect-video rounded-md border bg-black" />
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