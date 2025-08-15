'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { YourDataTable } from '@/components/your-data-table';
import EditDialog from '@/components/edit-dialog';
import { Contact } from '@/components/columns';
// NEW: Import AlertDialog components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<Contact[]>([]);
  const [tableData, setTableData] = useState<Contact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // NEW: State to control the "Not Found" dialog
  const [isNotFoundDialogOpen, setIsNotFoundDialogOpen] = useState(false);

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
    if (!file) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/ocr', { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok) {
        // ================== UPDATED LOGIC HERE ==================
        // Check if the returned data array is empty
        if (Array.isArray(data) && data.length > 0) {
          // If we have contacts, open the normal edit dialog
          setExtractedInfo(data);
          setIsDialogOpen(true);
        } else {
          // If data is empty, open our new "Not Found" dialog instead
          setIsNotFoundDialogOpen(true);
        }
        // ==========================================================
      } else {
        alert(`Error: ${data.error || 'An unknown error occurred.'}`);
      }
    } catch (error) {
      console.error('An error occurred:', error);
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
        
        <h2 className="text-2xl font-semibold mb-4">Saved Contacts</h2>
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
        
        {/* ================== NEW "NOT FOUND" DIALOG ================== */}
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
        {/* ============================================================= */}

      </div>
    </main>
  );
}