import { motion } from "framer-motion";
import { AiOutlineCheckCircle, AiOutlineClockCircle, AiOutlineExclamationCircle } from "react-icons/ai";

type StatusType = "pending" | "success" | "error" | "info";

interface StatusIndicatorProps {
    status: StatusType;
    message: string;
    variant?: "inline" | "card";
    details?: string;
}

export function StatusIndicator({
    status,
    message,
    variant = "inline",
    details,
}: StatusIndicatorProps) {
    const statusConfig = {
        pending: {
            icon: AiOutlineClockCircle,
            color: "#FF6B6B",
            dotClass: "status-dot pending",
        },
        success: {
            icon: AiOutlineCheckCircle,
            color: "#00A667",
            dotClass: "status-dot success",
        },
        error: {
            icon: AiOutlineExclamationCircle,
            color: "#FF3B3B",
            dotClass: "status-dot error",
        },
        info: {
            icon: AiOutlineClockCircle,
            color: "#3B82F6",
            dotClass: "status-dot pending",
        },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    if (variant === "inline") {
        return (
            <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
            >
                <span className={config.dotClass} />
                <span className="text-sm font-medium" style={{ color: config.color }}>
                    {message}
                </span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="frost-card p-4 flex items-start gap-3"
            style={{ borderColor: config.color, borderWidth: "1px" }}
        >
            <Icon className="h-5 w-5 mt-0.5" style={{ color: config.color }} />
            <div className="flex-1">
                <p className="text-sm font-semibold text-[#1F1F1F]">
                    {message}
                </p>
                {details && (
                    <p className="text-xs text-[#7A7A7A] mt-1">{details}</p>
                )}
            </div>
        </motion.div>
    );
}
