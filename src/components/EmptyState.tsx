export function EmptyState({ message = 'No media is available yet.' }: { message?: string }) {
  return (
    <div className="border border-dashed border-[#416846] bg-[#09130c] px-6 py-12 text-center text-sm text-[#769078]">
      {message}
    </div>
  )
}
