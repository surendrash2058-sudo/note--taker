window.addEventListener('DOMContentLoaded', async () => {
    const textarea = document.getElementById('note');
    const saveBtn = document.getElementById('save');
    const deleteBtn = document.getElementById('deleteBtn');
   
   
    // Load note
    const savedNote = await window.electronAPI.loadNote();
    textarea.value = savedNote;

  

    // Save button 
    saveBtn.addEventListener('click', async () => {
        await window.electronAPI.saveNote(textarea.value);
        alert('Note saved successfully! 💾');
    });

    // Delete button 
    deleteBtn.addEventListener('click', async () => {
        if (confirm(' Really delete All notes? This cannot be undone!')){
            try{
                await window.electronAPI.deleteNote();
                textarea.value = '';
                lastSavedText = '';
                statusEI.textContent = 'All notes deleted!';
                statusEI.style.color = 'red';
            } catch (err){
                alert('Delete failed');
            }
        }
       
    });

});