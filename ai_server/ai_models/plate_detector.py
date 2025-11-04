
import cv2
import numpy as np
from keras.models import model_from_json
import base64
import io
from PIL import Image
import json
import warnings
import tensorflow as tf
from tensorflow.keras.models import load_model as tf_load_model
from tensorflow.keras.utils import get_custom_objects
from scipy import ndimage
from skimage.feature import peak_local_max
import functools
from pathlib import Path
import os

warnings.filterwarnings('ignore')

class Label:
    def __init__(self, cl=-1, tl=np.array([0., 0.]), br=np.array([0., 0.]), prob=None):
        self.__tl = tl
        self.__br = br
        self.__cl = cl
        self.__prob = prob

    def __str__(self):
        return 'Class: %d, top left(x: %f, y: %f), bottom right(x: %f, y: %f)' % (
        self.__cl, self.__tl[0], self.__tl[1], self.__br[0], self.__br[1])

    def copy(self):
        return Label(self.__cl, self.__tl, self.__br)

    def wh(self): return self.__br - self.__tl

    def cc(self): return self.__tl + self.wh() / 2

    def tl(self): return self.__tl

    def br(self): return self.__br

    def tr(self): return np.array([self.__br[0], self.__tl[1]])

    def bl(self): return np.array([self.__tl[0], self.__br[1]])

    def cl(self): return self.__cl

    def area(self): return np.prod(self.wh())

    def prob(self): return self.__prob

    def set_class(self, cl):
        self.__cl = cl

    def set_tl(self, tl):
        self.__tl = tl

    def set_br(self, br):
        self.__br = br

    def set_wh(self, wh):
        cc = self.cc()
        self.__tl = cc - .5 * wh
        self.__br = cc + .5 * wh

    def set_prob(self, prob):
        self.__prob = prob

class DLabel(Label):
    def __init__(self, cl, pts, prob):
        self.pts = pts
        tl = np.amin(pts, axis=1)
        br = np.amax(pts, axis=1)
        Label.__init__(self, cl, tl, br, prob)

def im2single(Image):
    return Image.astype('float32') / 255

def getWH(shape):
    return np.array(shape[1::-1]).astype(float)

def IOU(tl1, br1, tl2, br2):
    wh1, wh2 = br1-tl1, br2-tl2
    assert((wh1 >= 0).all() and (wh2 >= 0).all())

    intersection_wh = np.maximum(np.minimum(br1, br2) - np.maximum(tl1, tl2), 0)
    intersection_area = np.prod(intersection_wh)
    area1, area2 = (np.prod(wh1), np.prod(wh2))
    union_area = area1 + area2 - intersection_area
    return intersection_area/union_area

def IOU_labels(l1, l2):
    return IOU(l1.tl(), l1.br(), l2.tl(), l2.br())

def nms(Labels, iou_threshold=0.5):
    SelectedLabels = []
    Labels.sort(key=lambda l: l.prob(), reverse=True)

    for label in Labels:
        non_overlap = True
        for sel_label in SelectedLabels:
            if IOU_labels(label, sel_label) > iou_threshold:
                non_overlap = False
                break

        if non_overlap:
            SelectedLabels.append(label)
    return SelectedLabels

def load_model_compatible(path):
    path = path.replace('.h5', '').replace('.json', '')
    with open('%s.json' % path, 'r') as json_file:
        model_json = json_file.read()

    model_config = json.loads(model_json)
    model_config['keras_version'] = '3.11.3'

    model = model_from_json(json.dumps(model_config), custom_objects={
        'Model': tf.keras.Model,
        'Input': tf.keras.layers.Input,
        'Conv2D': tf.keras.layers.Conv2D,
        'BatchNormalization': tf.keras.layers.BatchNormalization,
        'Activation': tf.keras.layers.Activation,
        'MaxPooling2D': tf.keras.layers.MaxPooling2D,
        'UpSampling2D': tf.keras.layers.UpSampling2D,
        'concatenate': tf.keras.layers.concatenate,
    })
    model.load_weights('%s.h5' % path)
    return model

def aleatoric_loss(y_true, y_pred):
    variance = y_pred
    y_true_encoded = tf.one_hot(tf.argmax(y_true, axis=-1), depth=tf.shape(y_pred)[-1])
    loss = 0.5 * tf.reduce_mean(tf.exp(-variance) * tf.keras.losses.categorical_crossentropy(y_true_encoded, y_pred) + variance)
    return loss

get_custom_objects().update({'aleatoric_loss': aleatoric_loss})

def find_T_matrix(pts, t_pts):
    A = np.zeros((8, 9))
    for i in range(0, 4):
        xi = pts[:, i]
        xil = t_pts[:, i]
        xi = xi.T

        A[i*2, 3:6] = -xil[2]*xi
        A[i*2, 6:] = xil[1]*xi
        A[i*2+1, :3] = xil[2]*xi
        A[i*2+1, 6:] = -xil[0]*xi

    [U, S, V] = np.linalg.svd(A)
    H = V[-1, :].reshape((3, 3))
    return H

def getRectPts(tlx, tly, brx, bry):
    return np.matrix([[tlx, brx, brx, tlx], [tly, tly, bry, bry], [1, 1, 1, 1]], dtype=float)

def normal(pts, side, mn, MN):
    pts_MN_center_mn = pts * side
    pts_MN = pts_MN_center_mn + mn.reshape((2, 1))
    pts_prop = pts_MN / MN.reshape((2, 1))
    return pts_prop

def reconstruct(I, Iresized, Yr, lp_threshold):
    net_stride = 2**4
    side = ((208 + 40)/2)/net_stride

    one_line = (470, 110)
    two_lines = (280, 200)

    Probs = Yr[..., 0]
    Affines = Yr[..., 2:]

    xx, yy = np.where(Probs > lp_threshold)
    WH = getWH(Iresized.shape)
    MN = WH/net_stride

    vxx = vyy = 0.5
    base = lambda vx, vy: np.matrix([[-vx, -vy, 1], [vx, -vy, 1], [vx, vy, 1], [-vx, vy, 1]]).T
    labels = []
    labels_frontal = []

    for i in range(len(xx)):
        x, y = xx[i], yy[i]
        affine = Affines[x, y]
        prob = Probs[x, y]

        mn = np.array([float(y) + 0.5, float(x) + 0.5])

        A = np.reshape(affine, (2, 3))
        A[0, 0] = max(A[0, 0], 0)
        A[1, 1] = max(A[1, 1], 0)
        B = np.zeros((2, 3))
        B[0, 0] = max(A[0, 0], 0)
        B[1, 1] = max(A[1, 1], 0)

        pts = np.array(A*base(vxx, vyy))
        pts_frontal = np.array(B*base(vxx, vyy))

        pts_prop = normal(pts, side, mn, MN)
        frontal = normal(pts_frontal, side, mn, MN)

        labels.append(DLabel(0, pts_prop, prob))
        labels_frontal.append(DLabel(0, frontal, prob))

    final_labels = nms(labels, 0.1)
    final_labels_frontal = nms(labels_frontal, 0.1)

    out_size, lp_type = (two_lines, 2) if ((final_labels_frontal[0].wh()[0] / final_labels_frontal[0].wh()[1]) < 1.7) else (one_line, 1)

    TLp = []
    if len(final_labels):
        final_labels.sort(key=lambda x: x.prob(), reverse=True)
        for _, label in enumerate(final_labels):
            t_ptsh = getRectPts(0, 0, out_size[0], out_size[1])
            ptsh = np.concatenate((label.pts * getWH(I.shape).reshape((2, 1)), np.ones((1, 4))))
            H = find_T_matrix(ptsh, t_ptsh)

            Ilp = cv2.warpPerspective(I, H, out_size, borderValue=0)
            TLp.append(Ilp)

    return final_labels, TLp, lp_type

def detect_lp(model, I, max_dim, lp_threshold):
    min_dim_img = min(I.shape[:2])
    factor = float(max_dim) / min_dim_img

    w, h = (np.array(I.shape[1::-1], dtype=float) * factor).astype(int).tolist()

    Iresized = cv2.resize(I, (w, h))

    T = Iresized.copy()
    T = T.reshape((1, T.shape[0], T.shape[1], T.shape[2]))

    Yr = model.predict(T)
    Yr = np.squeeze(Yr)

    L, TLp, lp_type = reconstruct(I, Iresized, Yr, lp_threshold)

    return L, TLp, lp_type

def detect_license_plate(wpod_net, Ivehicle, bound_dim, lp_threshold=0.5):
    _, LpImg, lp_type = detect_lp(wpod_net, im2single(Ivehicle), bound_dim, lp_threshold)
    if len(LpImg):
        return np.array(LpImg[0] * 255, dtype=np.uint8)
    return None

def preprocess_image(LpImg):
    gray = cv2.cvtColor(LpImg, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(gray)
    blurred = cv2.GaussianBlur(enhanced_gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 45, 15)
    return thresh, enhanced_gray

def connected_components_analysis(thresh, LpImg):
    _, labels = cv2.connectedComponents(thresh)
    mask = np.zeros(thresh.shape, dtype="uint8")
    total_pixels = LpImg.shape[0] * LpImg.shape[1]
    lower = total_pixels // 100
    upper = total_pixels // 15

    for label in np.unique(labels):
        if label == 0:
            continue

        labelMask = np.zeros(thresh.shape, dtype="uint8")
        labelMask[labels == label] = 255
        numPixels = cv2.countNonZero(labelMask)

        if lower < numPixels < upper:
            mask = cv2.add(mask, labelMask)

    return mask

def is_near_border(rect, img_height, img_width, border_threshold=1):
    x, y, w, h = rect
    return (x <= border_threshold or y <= border_threshold or
            x + w >= img_width - border_threshold or
            y + h >= img_height - border_threshold)

def find_and_sort_contours(mask, LpImg):
    cnts, _ = cv2.findContours(mask.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boundingBoxes = [cv2.boundingRect(c) for c in cnts]

    height, width = LpImg.shape[:2]
    boundingBoxes = [rect for rect in boundingBoxes if not is_near_border(rect, height, width)]

    def compare(rect1, rect2):
        if abs(rect1[1] - rect2[1]) > 10:
            return rect1[1] - rect2[1]
        else:
            return rect1[0] - rect2[0]

    boundingBoxes = sorted(boundingBoxes, key=functools.cmp_to_key(compare))
    return boundingBoxes

def preprocess_license_plate(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(gray)
    blurred = cv2.GaussianBlur(enhanced_gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 45, 15)
    return thresh

class LicensePlateDetector:
    def __init__(self, wpod_model_path, ocr_model_path):

        print(f"Loading WPOD-NET model from: {wpod_model_path}")
        self.wpod_net = load_model_compatible(wpod_model_path)
        
        print(f"Loading OCR model from: {ocr_model_path}")
        self.ocr_model = tf_load_model(ocr_model_path, custom_objects={'aleatoric_loss': aleatoric_loss})
        
        self.classes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                       'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                       'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
        
        print("License Plate Detector initialized successfully!")
    
    def detect_from_image_path(self, image_path, lp_threshold=0.5):
        image = cv2.imread(image_path)
        return self.detect_from_array(image, lp_threshold)
    
    def detect_from_array(self, opencv_image, lp_threshold=0.5):

        try:
            Dmax = 608
            Dmin = 288
            ratio = float(max(opencv_image.shape[:2])) / min(opencv_image.shape[:2])
            side = int(ratio * Dmin)
            bound_dim = min(side, Dmax)

            _, LpImg, lp_type = detect_lp(self.wpod_net, im2single(opencv_image), bound_dim, lp_threshold)

            if len(LpImg) == 0:
                return None

            LpImg_uint8 = np.array(LpImg[0] * 255, dtype=np.uint8)

            thresh, gray = preprocess_image(LpImg_uint8)
            mask = connected_components_analysis(thresh, LpImg_uint8)
            boundingBoxes = find_and_sort_contours(mask, LpImg_uint8)

            if not boundingBoxes:
                return None

            predictions = []
            for i, (x, y, w, h) in enumerate(boundingBoxes):
                try:
                    char_img = LpImg_uint8[y:y+h, x:x+w]
                    
                    thresh = preprocess_license_plate(char_img)
                    char_img_resized = cv2.resize(thresh, (28, 28))
                    
                    char_img_normalized = char_img_resized.astype('float32') / 255.0
                    char_img_input = char_img_normalized.reshape(1, 28, 28, 1)

                    char_pred = self.ocr_model.predict(char_img_input, verbose=0)
                    char_label = np.argmax(char_pred[0])
                    confidence = np.max(char_pred[0])

                    predicted_char = self.classes[char_label]
                    predictions.append(predicted_char)

                except Exception as e:
                    print(f"Error processing character {i+1}: {e}")
                    predictions.append('?')

            plate_number = ''.join(predictions)
            
            confidences = []
            for i, (x, y, w, h) in enumerate(boundingBoxes):
                try:
                    char_img = LpImg_uint8[y:y+h, x:x+w]
                    thresh = preprocess_license_plate(char_img)
                    char_img_resized = cv2.resize(thresh, (28, 28))
                    char_img_normalized = char_img_resized.astype('float32') / 255.0
                    char_img_input = char_img_normalized.reshape(1, 28, 28, 1)
                    char_pred = self.ocr_model.predict(char_img_input, verbose=0)
                    confidences.append(np.max(char_pred[0]))
                except:
                    pass
            
            avg_confidence = np.mean(confidences) if confidences else 0.5

            return {
                'plateNumber': plate_number,
                'confidence': float(avg_confidence),
                'boundingBox': None
            }

        except Exception as e:
            print(f"Detection error: {e}")
            import traceback
            traceback.print_exc()
            return None

