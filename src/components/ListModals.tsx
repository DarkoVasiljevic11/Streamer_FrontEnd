import { X } from 'lucide-react'

type ModalProps = {
  name: string
  lists: Record<string, string[]>
  onChange: (value: string) => void
  onClose: () => void
}

export function CreateListModal({ name, lists, onChange, onClose, onCreate }: ModalProps & { onCreate: () => void }) {
  const disabled = !name.trim() || Boolean(lists[name.trim()])
  return <div className="fixed inset-0 z-30 grid place-items-center bg-[#020603e8] p-4" onClick={onClose}><div className="w-full max-w-sm border border-[#416846] bg-[#09130c] p-6 shadow-[0_20px_100px_#000]" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[#c7f5bc]">New list</h2><button aria-label="Close" onClick={onClose} className="text-[#769078] hover:text-[#8dff66]"><X size={17} /></button></div><p className="mt-2 text-xs text-[#68826b]">Create a list for movies and shows you want to keep together.</p><input autoFocus value={name} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onCreate() }} placeholder="List name" className="mt-5 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]" /><div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="border border-[#29442c] px-4 py-2 text-xs text-[#769078]">CANCEL</button><button onClick={onCreate} disabled={disabled} className="bg-[#8dff66] px-4 py-2 text-xs font-bold text-[#07100b] disabled:opacity-40">CREATE LIST</button></div></div></div>
}

export function RenameListModal({ name, originalName, lists, onChange, onClose, onRename }: ModalProps & { originalName: string; onRename: () => void }) {
  const disabled = !name.trim() || Boolean(lists[name.trim()] && name.trim() !== originalName)
  return <div className="fixed inset-0 z-30 grid place-items-center bg-[#020603e8] p-4" onClick={onClose}><div className="w-full max-w-sm border border-[#416846] bg-[#09130c] p-6 shadow-[0_20px_100px_#000]" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[#c7f5bc]">Rename list</h2><button aria-label="Close" onClick={onClose} className="text-[#769078] hover:text-[#8dff66]"><X size={17} /></button></div><input autoFocus value={name} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onRename() }} className="mt-5 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]" /><div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="border border-[#29442c] px-4 py-2 text-xs text-[#769078]">CANCEL</button><button onClick={onRename} disabled={disabled} className="bg-[#8dff66] px-4 py-2 text-xs font-bold text-[#07100b] disabled:opacity-40">SAVE</button></div></div></div>
}
