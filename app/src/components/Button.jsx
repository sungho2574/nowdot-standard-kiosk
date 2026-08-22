export default function Button({ onClick, children, className = "" }) {
  return (
    <button onClick={onClick} className={`rounded-full bg-white text-black p-2 shadow-lg border border-gray-200 ${className}`}>
      {children}
    </button>
  );
}
