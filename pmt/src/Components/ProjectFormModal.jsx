import React from "react"
import { Link } from "gatsby"

const ProjectFormModal=()=>{
    return (
        <div className="modal fade" id="projectFormModal" tabIndex="-1" role="dialog" aria-labelledby="projectFormModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="projectFormModalLabel">Project Form</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

}
export default ProjectFormModal