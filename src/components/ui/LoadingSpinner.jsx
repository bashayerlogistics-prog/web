export default function LoadingSpinner({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-primary-100 dark:border-primary-900" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
      </div>
      {text && <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{text}</p>}
    </div>
  );
}
