
import os
import cv2
import fitz
import pytesseract
import numpy as np

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)




def preprocess_image(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    gray = cv2.resize(
        gray,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC,
    )

    return cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )[1]





def ocr_image(image):
    """Extract English text using Tesseract OCR."""

    if image is None or image.size == 0:
        return ""

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    gray = cv2.resize(
        gray,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC,
    )

    gray = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    ).apply(gray)

    return pytesseract.image_to_string(
        gray,
        lang="eng",
        config="--oem 3 --psm 6",
    )



def find_table_cells(image):
    """Detect the timetable grid in the upper part of a scanned page."""

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    # Timetable is above the subject/faculty list in this document.
    # Limit the search area to avoid detecting the lower information table.
    roi_height = int(height * 0.50)
    roi = gray[:roi_height, :]

    # Enlarge the timetable region for OCR.
    roi = cv2.resize(
        roi,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC,
    )

    # Detect grid lines from the scanned page.
    binary = cv2.adaptiveThreshold(
        roi,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        31,
        10,
    )

    h, w = binary.shape

    horizontal_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (max(20, w // 35), 1),
    )
    vertical_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (1, max(15, h // 25)),
    )

    horizontal = cv2.morphologyEx(
        binary,
        cv2.MORPH_OPEN,
        horizontal_kernel,
        iterations=1,
    )
    vertical = cv2.morphologyEx(
        binary,
        cv2.MORPH_OPEN,
        vertical_kernel,
        iterations=1,
    )

    # Join small gaps in grid lines.
    horizontal = cv2.dilate(
        horizontal,
        cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1)),
        iterations=2,
    )
    vertical = cv2.dilate(
        vertical,
        cv2.getStructuringElement(cv2.MORPH_RECT, (1, 3)),
        iterations=2,
    )

    def line_positions(mask, axis):
        projection = np.sum(mask > 0, axis=axis)
        if projection.size == 0 or projection.max() == 0:
            return []

        threshold = max(5, int(projection.max() * 0.30))
        positions = np.where(projection >= threshold)[0]

        if len(positions) == 0:
            return []

        groups = [[int(positions[0])]]

        for p in positions[1:]:
            p = int(p)
            if p - groups[-1][-1] <= 8:
                groups[-1].append(p)
            else:
                groups.append([p])

        return [int(np.mean(group)) for group in groups]

    # axis=1 produces horizontal row positions;
    # axis=0 produces vertical column positions.
    ys = line_positions(horizontal, 1)
    xs = line_positions(vertical, 0)

    if len(ys) < 3 or len(xs) < 3:
        return []

    rows = []

    for ri in range(len(ys) - 1):
        y1, y2 = ys[ri], ys[ri + 1]

        if y2 - y1 < 12:
            continue

        row = []

        for ci in range(len(xs) - 1):
            x1, x2 = xs[ci], xs[ci + 1]

            if x2 - x1 < 12:
                continue

            cell = roi[
                min(y1 + 5, h):max(y1 + 5, min(y2 - 5, h)),
                min(x1 + 5, w):max(x1 + 5, min(x2 - 5, w)),
            ]

            if cell.size == 0:
                row.append("")
                continue

            # Use English OCR and preserve short subject codes.
            text = pytesseract.image_to_string(
                cell,
                lang="eng",
                config="--oem 3 --psm 6",
            )

            row.append(" ".join(text.split()))

        if any(row):
            rows.append(row)

    return rows

def extract_from_image(file_path):
    image = cv2.imread(file_path)

    if image is None:
        raise ValueError("Unable to read the uploaded image.")

    return ocr_image(image)


def extract_from_pdf(file_path):
    document = fitz.open(file_path)
    pages = []

    try:
        for page in document:
            pix = page.get_pixmap(
                matrix=fitz.Matrix(3, 3),
                alpha=False,
            )

            image = np.frombuffer(
                pix.samples,
                dtype=np.uint8,
            ).reshape(pix.height, pix.width, pix.n)

            if pix.n == 4:
                image = cv2.cvtColor(
                    image,
                    cv2.COLOR_RGBA2BGR,
                )
            elif pix.n == 3:
                image = cv2.cvtColor(
                    image,
                    cv2.COLOR_RGB2BGR,
                )

            pages.append(ocr_image(image))

    finally:
        document.close()

    return "\n".join(pages)



def extract_timetable_data(file_path):
    if not os.path.isfile(file_path):
        raise FileNotFoundError("Timetable file not found.")

    extension = os.path.splitext(file_path)[1].lower()

    all_text = []
    all_tables = []

    if extension == ".pdf":
        document = fitz.open(file_path)

        try:
            for page in document:
                pix = page.get_pixmap(
                    matrix=fitz.Matrix(3, 3),
                    alpha=False,
                )

                image = np.frombuffer(
                    pix.samples,
                    dtype=np.uint8,
                ).reshape(pix.height, pix.width, pix.n)

                if pix.n == 4:
                    image = cv2.cvtColor(
                        image,
                        cv2.COLOR_RGBA2BGR,
                    )
                elif pix.n == 3:
                    image = cv2.cvtColor(
                        image,
                        cv2.COLOR_RGB2BGR,
                    )

                # Extract all page text separately.
                page_text = ocr_image(image)
                all_text.append(page_text)

                # Detect only the weekly timetable grid.
                # find_table_cells() already limits its search
                # to the upper 50% of the page.
                detected_rows = find_table_cells(image)

                if detected_rows:
                    all_tables.extend(detected_rows)

        finally:
            document.close()

    elif extension in {
        ".png",
        ".jpg",
        ".jpeg",
        ".bmp",
        ".tif",
        ".tiff",
    }:
        image = cv2.imread(file_path)

        if image is None:
            raise ValueError(
                "Unable to read the uploaded image."
            )

        all_text.append(ocr_image(image))
        all_tables = find_table_cells(image)

    else:
        raise ValueError(
            "Unsupported file type. Upload an image or PDF."
        )

    text = "\n".join(all_text)

    return {
        "text": text,
        "timetable": all_tables,
        "other_information": text,
        "table_detected": bool(all_tables),
    }


def extract_timetable(file_path):
    return extract_timetable_data(file_path)["text"]
