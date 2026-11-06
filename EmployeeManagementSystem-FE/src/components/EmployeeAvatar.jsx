import { useEffect, useState } from "react";
import { api } from "../api.js";
import { initials } from "../utils/formatters.js";

export default function EmployeeAvatar({ employeeId, endpoint, hasPhoto, file, name, className = "" }) {
  const [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (file) {
      objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    if (!hasPhoto) {
      setImageUrl("");
      return undefined;
    }
    api(endpoint || `/employees/${employeeId}/photo`)
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        }
      })
      .catch(() => {
        if (active) setImageUrl("");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [employeeId, endpoint, hasPhoto, file]);
  return <span className={`grid shrink-0 place-items-center overflow-hidden bg-violet-100 font-bold uppercase text-violet-700 ${className}`}>
    {imageUrl ? <img src={imageUrl} alt={`${name || "Employee"} profile`} className="h-full w-full object-cover" /> : initials(name)}
  </span>;
}
