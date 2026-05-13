/**
 * BottomSheetModal.jsx
 * Drop-in React Native replacement for the web Modal.tsx component.
 * Props:
 *   visible    {boolean}
 *   title      {string}
 *   onClose    {() => void}
 *   footer     {ReactNode}   – rendered as a horizontal button row at the bottom
 *   children   {ReactNode}
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const C = {
  navBg:    '#1a1209',
  border:   '#cfc4aa',
  cream:    '#ede5d0',
  textDark: '#1a1209',
  textMid:  '#3d2f1a',
  textMuted:'#7a6a52',
  red:      '#6b1d2a',
  white:    '#ffffff',
};

const BottomSheetModal = ({ visible, title, onClose, footer, children }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <KeyboardAvoidingView
      style={s.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        {/* Handle bar */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        <ScrollView
          style={s.body}
          contentContainerStyle={s.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        {/* Footer */}
        {footer && (
          <View style={s.footer}>
            {footer}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

export default BottomSheetModal;

// ── Footer button helpers (convenience exports) ───────────────────────────────
export const ModalCancelButton = ({ onPress, label = 'Cancel' }) => (
  <TouchableOpacity style={s.cancelBtn} onPress={onPress}>
    <Text style={s.cancelText}>{label}</Text>
  </TouchableOpacity>
);

export const ModalSubmitButton = ({ onPress, label, disabled, loading, loadingLabel, color }) => (
  <TouchableOpacity
    style={[s.submitBtn, { backgroundColor: color ?? C.red }, disabled && s.disabledBtn]}
    onPress={onPress}
    disabled={disabled}>
    <Text style={s.submitText}>{loading ? loadingLabel : label}</Text>
  </TouchableOpacity>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cream,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textDark,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: C.textMuted,
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.cream,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
  },
  cancelText: {
    color: C.textMid,
    fontSize: 14,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 7,
    minWidth: 110,
    alignItems: 'center',
  },
  submitText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.55,
  },
});