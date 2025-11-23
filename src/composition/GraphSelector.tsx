import { useState, forwardRef } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '../component/utils';
import { Button } from '../component/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '../component/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../component/popover';

interface GraphSelectorProps {
    value: string;
    options: string[];
    onValueChange: (value: string) => void;
}

export const GraphSelector = forwardRef<HTMLButtonElement, GraphSelectorProps>(
    ({
        value,
        options,
        onValueChange
    }, ref) => {
        const [open, setOpen] = useState(false);

        const handleSelect = (selectedValue: string) => {
            onValueChange(selectedValue);
            setOpen(false);
        };

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={ref}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[200px] justify-between"
                    >
                        {value}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search graphs..." />
                        <CommandList>
                            <CommandEmpty>No graph found.</CommandEmpty>
                            <CommandGroup>
                                {options.sort().map((option) => (
                                    <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={() => handleSelect(option)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === option ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup>
                                <CommandItem
                                    onSelect={() => handleSelect('__create_new__')}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create new graph
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    }
);

GraphSelector.displayName = 'GraphSelector';
