'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { YourDataTable } from '@/components/your-data-table';
import EditDialog from '@/components/edit-dialog';
import { Contact } from '@/components/columns'; // Import the Contact type

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<Contact[]>([]);
  const [tableData, setTableData] = useState<Contact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // NEW: State to track which row we are editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
        setExtractedInfo(data);
        setIsDialogOpen(true);
      } else {
        alert(`Error: ${data.error || 'An unknown error occurred.'}`);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // UPDATED: handleSave now knows about editing vs. adding
  const handleSave = (data: Contact[]) => {
    if (editingIndex !== null) {
      // We are editing an existing row
      const updatedTableData = [...tableData];
      updatedTableData[editingIndex] = data[0]; // Assuming edit dialog saves one contact
      setTableData(updatedTableData);
      setEditingIndex(null); // Reset editing index
    } else {
      // We are adding new rows from an OCR scan
      setTableData((prevData) => [...prevData, ...data]);
    }
    setIsDialogOpen(false);
  };

  // NEW: Function to handle deleting a row
  const handleDeleteRow = (index: number) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      setTableData((prevData) => prevData.filter((_, i) => i !== index));
    }
  };

  // NEW: Function to handle editing a row
  const handleEditRow = (index: number, contact: Contact) => {
    setEditingIndex(index);
      // The edit dialog expects an array, so we wrap the contact in one
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

        {/* UPDATED: Pass the new handler functions to the data table */}
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
      </div>
    </main>
  );
}