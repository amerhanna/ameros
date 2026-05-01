"use client";


export default function WebApp({url, title}: {url: string, title: string}) {

  if (!url) {
    return <div className="p-4">No URL provided</div>;
  }

  return (
    <iframe
      src={url}
      className="w-full h-full bg-white border-none"
      title={title || "Web App"}
    />
  );
}
