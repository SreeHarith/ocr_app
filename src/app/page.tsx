'use client';

import { useState, useEffect } from 'react';
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
import { CSVLink } from 'react-csv';
import { Download } from 'lucide-react';


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<Contact[]>([]);
  const [tableData, setTableData] = useState<Contact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isNotFoundDialogOpen, setIsNotFoundDialogOpen] = useState(false);

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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

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
  };

  const handleExtractClick = async () => {
    if (!file) {
      alert('Please select a file first.');
      return;
    }
    setIsLoading(true);

    try {
      // Step 1: Upload the image file to our backend, which forwards it to Cloudinary.
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

      // Step 2: Send the public image URL to the OCR API.
      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }), // Send the URL in the body
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
            Upload an image to extract all names and phone numbers.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 border rounded-lg bg-card shadow-sm mb-8">
          <Input 
            id="picture" 
            type="file" 
            onChange={handleFileChange} 
            className="max-w-xs cursor-pointer"
            accept="image/png, image/jpeg, image/webp"
          />
          <Button onClick={handleExtractClick} disabled={!file || isLoading}>
            {isLoading ? 'Processing...' : 'Extract Information'}
          </Button>
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
      </div>
    </main>
  );
}
