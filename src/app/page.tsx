"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import React, { useRef, useState } from "react";

const Home = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmedImage, setConfirmedImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drawing state
  const [lines, setLines] = useState<{ points: { x: number; y: number }[] }[]>(
    []
  );
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [connectLines, setConnectLines] = useState(false);

  // Handle file input
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Drawing handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // Tính tỷ lệ giữa canvas thật và canvas hiển thị
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setDrawing(true);
    setLines((prev) => [...prev, { points: [{ x, y }] }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setLines((prev) => {
      const newLines = [...prev];
      newLines[newLines.length - 1].points.push({ x, y });
      return newLines;
    });
  };

  const handleCanvasMouseUp = () => {
    setDrawing(false);
  };

  // Nối nét đầu với nét cuối bằng chuột phải
  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (lines.length < 2) return;
    const first = lines[0].points[0];
    const lastLine = lines[lines.length - 1];
    const last = lastLine.points[lastLine.points.length - 1];
    setLines((prev) => [...prev, { points: [last, first] }]);
  };

  // Vẽ lại canvas mỗi khi lines hoặc ảnh/thay đổi
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !confirmedImage) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = "#007BDE";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    if (connectLines && lines.length > 0) {
      // Nối tất cả các điểm thành một đường duy nhất
      ctx.beginPath();
      lines.forEach((line, lineIdx) => {
        line.points.forEach((pt, idx) => {
          if (lineIdx === 0 && idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
      });
      ctx.stroke();
    } else {
      // Vẽ từng nét riêng biệt như cũ
      lines.forEach((line) => {
        ctx.beginPath();
        line.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      });
    }
  }, [lines, confirmedImage, connectLines]);

  // Confirm image selection
  const handleConfirm = () => {
    setConfirmedImage(preview);
    setDialogOpen(false);
    setLines([]);
    // Nếu đã có preview, lấy kích thước luôn từ thẻ img preview
    if (preview) {
      const img = document.createElement("img");
      img.src = preview;
      img.onload = () => {
        setImgSize({ width: img.width, height: img.height });
        imageRef.current = img;
      };
      // Nếu ảnh đã cache sẵn, onload có thể không gọi, nên kiểm tra luôn:
      if (img.complete) {
        setImgSize({ width: img.width, height: img.height });
        imageRef.current = img;
      }
    }
  };

  // Cancel and close dialog
  const handleClose = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    setDialogOpen(false);
  };

  // Lấy kích thước ảnh để set canvas
  const [imgSize, setImgSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  React.useEffect(() => {
    if (!confirmedImage) return;
    const img = new window.Image();
    img.src = confirmedImage;
    img.onload = () => setImgSize({ width: img.width, height: img.height });
    imageRef.current = img;
  }, [confirmedImage]);

  // Xóa toàn bộ nét vẽ
  const handleClearAllLines = () => setLines([]);

  // Xóa nét gần nhất vừa vẽ
  const handleRemoveLastLine = () => setLines((prev) => prev.slice(0, -1));

  // Xóa toàn bộ ảnh và nét vẽ
  const handleClearAll = () => {
    setConfirmedImage(null);
    setLines([]);
    setImgSize(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Lấy ra các đỉnh (điểm đầu của mỗi nét, bỏ nét cuối nếu là đoạn nối về điểm đầu)
  const vertices = React.useMemo(() => {
    if (
      lines.length > 1 &&
      lines[lines.length - 1].points.length === 2 &&
      lines[0].points[0].x === lines[lines.length - 1].points[1].x &&
      lines[0].points[0].y === lines[lines.length - 1].points[1].y
    ) {
      // Đã hoàn thành, bỏ nét nối cuối
      return lines.slice(0, -1).map((line) => line.points[0]);
    }
    return lines.map((line) => line.points[0]);
  }, [lines]);

  // Nút hoàn thành: nối điểm đầu và cuối
  const handleCompletePolygon = () => {
    if (lines.length < 2) return;
    const first = lines[0].points[0];
    const lastLine = lines[lines.length - 1];
    const last = lastLine.points[lastLine.points.length - 1];
    // Nếu đã khép kín rồi thì không nối nữa
    if (last.x === first.x && last.y === first.y) return;
    setLines((prev) => [...prev, { points: [last, first] }]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-black">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="mb-6 dark:bg-[#242424] bg-[#F8FAFC] dark:text-[#7B7B7B] text-black w-[140px] h-10 font-inter text-sm font-medium leading-normal rounded-full border-transparent"
            onClick={() => setDialogOpen(true)}
          >
            Tải ảnh lên
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] h-max-content-plus-40 dark:bg-gradient-to-bl from-65% from-black to-100% to-[#007BDE59] p-0 border-none">
          <div className="flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg p-2 space-y-6">
              <h2 className="text-xl dark:text-white text-black font-medium ">
                Chọn ảnh để tìm kiếm
              </h2>
              <div
                className={cn(
                  "relative border-2 border-dashed mb-[20px] rounded-lg p-6 transition-colors",
                  preview ? "p-2" : "aspect-square"
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  onChange={handleChange}
                  accept="image/*"
                />
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-full object-contain rounded"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 rounded-full bg-black/50 hover:bg-black/75"
                      onClick={() => setPreview(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="h-full flex flex-col items-center justify-center gap-4 cursor-pointer"
                    onClick={() => inputRef.current?.click()}
                  >
                    <div className="p-4 rounded-full">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-400">Tải ảnh lên</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bottom-0 w-full">
            <div className="flex justify-end gap-4 bg-white/10 p-4 backdrop-blur-sm">
              <Button
                disabled={!preview}
                onClick={handleConfirm}
                className="text-white rounded-xl h-8 w-20"
              >
                Xác nhận
              </Button>
              <Button
                onClick={handleClose}
                className="dark:text-white text-black rounded-xl h-8 w-16 bg-transparent border border-gray-400"
              >
                Huỷ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hiển thị ảnh và vùng vẽ sau khi xác nhận */}
      {confirmedImage && imgSize && (
        <div className="mt-8 flex gap-6 items-start">
          {/* Vùng ảnh và canvas */}
          <div className="border rounded shadow-lg bg-white p-4 flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={imgSize.width}
              height={imgSize.height}
              style={{
                borderRadius: 20,
                overflow: "hidden",
                touchAction: "none",
                cursor: "crosshair",
                background: "#fff",
                maxWidth: 400,
                maxHeight: 400,
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onContextMenu={handleCanvasContextMenu}
            />
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAllLines}
                disabled={lines.length === 0}
              >
                Xóa toàn bộ nét
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveLastLine}
                disabled={lines.length === 0}
              >
                Xóa nét vừa vẽ
              </Button>
              <Button size="sm" variant="destructive" onClick={handleClearAll}>
                Xóa ảnh & nét
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleCompletePolygon}
                disabled={lines.length < 2}
              >
                Hoàn thành
              </Button>
            </div>
            {/* Checkbox nối các điểm */}
            <label className="flex items-center gap-2 mt-4 select-none">
              <input
                type="checkbox"
                checked={connectLines}
                onChange={(e) => setConnectLines(e.target.checked)}
              />
              <span className="text-sm">Nối giữa các điểm vẽ</span>
            </label>
          </div>
          {/* XÓA VÙNG TỌA ĐỘ NÉT VẼ Ở ĐÂY */}
          {/* Vùng tọa độ các đỉnh */}
          <div className="border rounded shadow-lg bg-white p-4 w-80 max-h-[400px] overflow-auto">
            <div className="font-semibold mb-2">Tọa độ các đỉnh</div>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all">
              {JSON.stringify(vertices, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
