type ListPickerProps = {
  title: string
  lists: Record<string, string[]>
  onToggle: (listName: string, title: string) => void
  onCreate: () => void
}

export function ListPicker({ title, lists, onToggle, onCreate }: ListPickerProps) {
  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute right-2 top-10 z-10 w-40 border border-[#416846] bg-[#09130c] p-2 text-[10px] shadow-xl"
    >
      <p className="mb-2 text-[#769078]">ADD TO LIST</p>
      {Object.keys(lists).map((listName) => (
        <button
          key={listName}
          onClick={() => onToggle(listName, title)}
          className="flex w-full items-center justify-between px-2 py-2 text-left text-[#b5d7b0] hover:bg-[#102418]"
        >
          {listName}
          <span className="text-[#8dff66]">{lists[listName].includes(title) ? '✓' : ''}</span>
        </button>
      ))}
      <button
        onClick={onCreate}
        className="mt-1 w-full border-t border-[#1f3823] px-2 pt-2 text-left text-[#8dff66]"
      >
        + NEW LIST
      </button>
    </div>
  )
}
