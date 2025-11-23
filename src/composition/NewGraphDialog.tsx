import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../component/dialog';
import { Button } from '../component/button';
import { GraphId } from '../core/Node';

interface NewGraphDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onGraphCreated: (graphId: GraphId) => void;
}

export function NewGraphDialog({ isOpen, onOpenChange, onGraphCreated }: NewGraphDialogProps) {
    const [newGraphName, setNewGraphName] = useState('');

    const handleCreateNewGraph = () => {
        if (newGraphName && newGraphName.trim()) {
            const graphId = newGraphName.trim() as GraphId;
            onGraphCreated(graphId);
            onOpenChange(false);
            setNewGraphName('');
        }
    };

    const handleCancelNewGraph = () => {
        onOpenChange(false);
        setNewGraphName('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Graph</DialogTitle>
                    <DialogDescription>
                        Enter a name for your new graph.
                    </DialogDescription>
                </DialogHeader>
                <input
                    type="text"
                    value={newGraphName}
                    onChange={(e) => setNewGraphName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleCreateNewGraph();
                        } else if (e.key === 'Escape') {
                            handleCancelNewGraph();
                        }
                    }}
                    placeholder="Graph name"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />
                <DialogFooter>
                    <Button variant="outline" onClick={handleCancelNewGraph}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreateNewGraph} disabled={!newGraphName.trim()}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
