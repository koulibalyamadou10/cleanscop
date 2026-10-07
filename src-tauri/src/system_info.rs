use sysinfo::{Disks, System};

use crate::models::SystemInfo;
use crate::state::AppState;

pub fn collect_system_info(state: &AppState) -> SystemInfo {
    let mut sys = System::new();
    sys.refresh_all();

    let os_name = System::name().unwrap_or_else(|| "Unknown OS".into());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".into());

    let disks = Disks::new_with_refreshed_list();
    let (disk_total_bytes, disk_available_bytes) =
        disks.list().iter().fold((0u64, 0u64), |acc, d| {
            (
                acc.0.saturating_add(d.total_space()),
                acc.1.saturating_add(d.available_space()),
            )
        });
    let disk_used_bytes = disk_total_bytes.saturating_sub(disk_available_bytes);

    SystemInfo {
        os_name,
        os_version,
        disk_total_bytes,
        disk_used_bytes,
        disk_free_bytes: disk_available_bytes,
        last_scan: state.last_scan(),
    }
}
