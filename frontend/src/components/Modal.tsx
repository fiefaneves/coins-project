import styles from '../css/Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'confirm'; // 'danger' para excluir, 'confirm' para editar
}

export function Modal({ isOpen, title, message, onConfirm, onCancel, type = 'confirm' }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modalCard}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                
                <div className={styles.actions}>
                    <button onClick={onCancel} className={`${styles.btn} ${styles.btnCancel}`}>
                        Cancelar
                    </button>
                    
                    <button 
                        onClick={onConfirm} 
                        className={`${styles.btn} ${type === 'danger' ? styles.btnDanger : styles.btnConfirm}`}
                    >
                        {type === 'danger' ? 'Sim, Excluir' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}